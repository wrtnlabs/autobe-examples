import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_unban_insufficient_privileges(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(owner);
  // Create community as owner
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>() || null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 2: Create another member (non-owner, non-moderator)
  const otherConnection: api.IConnection = { host: connection.host };
  const otherMember: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(otherConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(otherMember);
  // Step 3: Owner bans the other member
  const ban: IRedditPlatformCommunityBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: otherMember.id,
          expires_at: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.predicate(
    "ban should be active initially",
    ban.isActive === true,
  );
  TestValidator.equals("ban should be permanent", ban.isPermanent, true);
  TestValidator.equals(
    "ban deleted_at should be null initially",
    ban.deleted_at,
    null,
  );
  // Step 4: Attempt unban with insufficient privileges (as the banned user)
  await TestValidator.httpError(
    "should return 403 Forbidden when non-moderator attempts unban",
    403,
    async () => {
      await api.functional.redditPlatform.member.communities.bans.erase(
        otherConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      );
    },
  );
  // Step 5: Verify ban still exists and was not deleted
  const fetchedBan: IRedditPlatformCommunityBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: otherMember.id,
          expires_at: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(fetchedBan);
  TestValidator.equals(
    "ban should still be active after failed unban attempt",
    fetchedBan.isActive,
    true,
  );
  TestValidator.equals(
    "ban deleted_at should remain null",
    fetchedBan.deleted_at,
    null,
  );
}
