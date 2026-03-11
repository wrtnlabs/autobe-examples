import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_community_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner_${RandomGenerator.alphaNumeric(10)}@test.com`,
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community as owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate target user (will be banned then unbanned)
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUserAuth = await authorize_member_join(targetUserConnection, {
    body: {
      email: `target_${RandomGenerator.alphaNumeric(10)}@test.com`,
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(targetUserAuth);
  // 4. Subscribe target user to community
  const subscription =
    await api.functional.redditPlatform.member.subscriptions.subscribe(
      targetUserConnection,
      {
        body: {
          reddit_platform_community_id: community.id,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Owner bans target user
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          userId: targetUserAuth.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Verify ban is active (deleted_at should be null)
  TestValidator.equals("ban active initially", ban.deletedAt, null);
  // 6. Owner unban target user (DELETE ban record - soft delete sets deleted_at)
  await api.functional.redditPlatform.member.communities.bans.eraseByCommunityidAndBanid(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 7. Verify original subscription still exists and is active after unban
  TestValidator.predicate(
    "user remains subscribed after unban",
    subscription.deleted_at === null,
  );
  // 8. Verify ban record can be created again after unban (history preserved)
  // Create a new ban record to verify the system still accepts bans
  const newBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          userId: targetUserAuth.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(newBan);
  // Verify this is a new ban record (different ID)
  TestValidator.notEquals("new ban record created", newBan.id, ban.id);
  // Verify new ban is also active
  TestValidator.equals("new ban active", newBan.deletedAt, null);
  // Cleanup: Unban the new ban record
  await api.functional.redditPlatform.member.communities.bans.eraseByCommunityidAndBanid(
    ownerConnection,
    {
      communityId: community.id,
      banId: newBan.id,
    },
  );
}
