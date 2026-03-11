import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
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
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

/**
 * Test that community moderators can unban users with the same authority as owners.
 *
 * This test validates the moderator privilege inheritance for ban management:
 * 1. Owner creates community
 * 2. Owner adds moderator to community
 * 3. Owner bans a user
 * 4. Moderator performs the unban operation
 * 5. Verify ban record is soft-deleted
 */
export async function test_api_community_unban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Step 2: Owner creates a community
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // Step 4: Owner adds moderator to community
  const moderatorAssignment: IRedditPlatformCommunityModerator =
    await api.functional.redditPlatform.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderatorAuth.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // Step 5: Create and authenticate as user to ban
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedUserAuth);
  // Step 6: Owner bans the user
  const banRecord: IRedditPlatformCommunityBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          userId: bannedUserAuth.user.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify ban is active (deleted_at should be null)
  TestValidator.equals(
    "ban record should be active initially",
    banRecord.deletedAt,
    null,
  );
  // Step 7: Authenticate as moderator and perform unban
  const moderatorUnbanConnection: api.IConnection = { host: connection.host };
  const moderatorUnbanAuth = await authorize_member_login(
    moderatorUnbanConnection,
    {
      body: {
        email: moderatorAuth.user.username,
        password: moderatorAuth.user.username + "password",
      } satisfies IRedditPlatformMember.ILogin,
    },
  );
  typia.assert(moderatorUnbanAuth);
  // Perform unban operation as moderator
  await api.functional.redditPlatform.member.communities.bans.eraseByCommunityidAndUserid(
    moderatorUnbanConnection,
    {
      communityId: community.id,
      userId: bannedUserAuth.user.id,
    },
  );
  // Verify the ban record was soft-deleted
  // The banRecord variable is mutated by the API, deleted_at should now be set
  TestValidator.predicate(
    "ban record should be soft-deleted",
    banRecord.deletedAt !== null,
  );
}
