import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
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
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test authorization validation for community ban list endpoint.
 *
 * Validates that only community moderators or owners can access ban records, while non-moderator users receive 403 Forbidden errors. This test ensures the authorization check correctly enforces role-based access control on the ban list endpoint.
 *
 * The test follows a natural workflow: an owner creates a community and bans a member, then a third party without moderation privileges attempts to access the ban list. This validates the security boundary that prevents unauthorized users from viewing moderation data.
 *
 * 1. Owner member registers and authenticates.
 * 2. Owner creates a community with unique name.
 * 3. Second member registers and authenticates (to be banned).
 * 4. Owner creates ban record for second member.
 * 5. Third member registers and authenticates (non-moderator).
 * 6. Non-moderator attempts to list bans - should receive 403 Forbidden.
 */
export async function test_api_ban_list_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community by the owner
  const communityName =
    RandomGenerator.alphabets(8) + "_" + RandomGenerator.alphabets(4);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: typia.random<string & tags.MaxLength<500>>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member (to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Create ban record (performed by owner/moderator on banned member)
  const banRecord =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          user_id: bannedMemberAuth.id,
          reason: "Violating community rules - spam posting",
        } satisfies IRedditPlatformBannedUser.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Create third member (non-moderator - no role in community)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAuth = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(nonModeratorAuth);
  // 6. Attempt to list bans as non-moderator - should receive 403 Forbidden
  await TestValidator.error("non-moderator cannot list bans", async () => {
    await api.functional.redditPlatform.member.communities.bans.index(
      nonModeratorConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  });
}
