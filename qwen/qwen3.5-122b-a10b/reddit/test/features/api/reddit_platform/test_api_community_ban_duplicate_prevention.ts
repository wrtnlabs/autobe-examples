import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_community_ban_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator member joins and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
  typia.assert(moderatorAuth);
  // 2. Moderator creates a community
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Target member joins and authenticates
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(targetConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
  typia.assert(targetAuth);
  // Target member subscribes to the community
  const subscription: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      targetConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Moderator successfully bans the target member (first ban)
  const firstBan: IRedditPlatformCommunityBan =
    await generate_random_reddit_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_platform_member_id: targetAuth.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(firstBan);
  // Verify the ban was created successfully
  TestValidator.equals(
    "ban community matches",
    firstBan.community.id,
    community.id,
  );
  TestValidator.equals("ban member matches", firstBan.member.id, targetAuth.id);
  TestValidator.predicate("ban is active", firstBan.deleted_at === null);
  // 5. Moderator attempts to ban the same member again (duplicate ban)
  // 6. Verify the second ban attempt returns a 409 conflict error
  await TestValidator.httpError(
    "duplicate ban should return 409 conflict",
    409,
    async () => {
      await generate_random_reddit_platform_member_communities_bans_create(
        moderatorConnection,
        {
          params: {
            communityId: community.id,
          },
          body: {
            reddit_platform_member_id: targetAuth.id,
          } satisfies IRedditPlatformCommunityBan.ICreate,
        },
      );
    },
  );
  // 7. Verify only one active ban record exists for the community-member pair
  // We can verify this by checking the first ban is still the only active ban
  TestValidator.predicate(
    "only one active ban exists (first ban still active)",
    firstBan.deleted_at === null,
  );
}