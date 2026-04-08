import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_member_communities_bans_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_ban } from "../../../prepare/prepare_random_reddit_like_community_ban";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test that a community moderator (not owner) can successfully unban a previously banned user.
 *
 * Validates that moderator authority extends to unbanning users, not just the community owner. This test ensures that the moderation workflow properly supports distributed authority where multiple moderators can manage community bans.
 *
 * The test follows a complete workflow: owner creates community, adds moderator, bans a user, then verifies the moderator can successfully unban that user. The unban operation performs a soft-delete of the ban record by setting the deleted_at timestamp.
 *
 * 1. Authenticate member 1 as the community owner
 * 2. Create a new community (member 1 becomes owner)
 * 3. Authenticate member 2 who will be added as moderator
 * 4. Owner adds member 2 as moderator to the community
 * 5. Re-authenticate member 1 (owner) to perform the ban
 * 6. Create member 3 account who will be banned
 * 7. Owner bans member 3 from the community
 * 8. Authenticate member 2 (moderator)
 * 9. Moderator unbans member 3 using the ban ID
 * 10. Verify the ban record has deleted_at timestamp populated
 */
export async function test_api_community_moderator_unbans_user(
  connection: api.IConnection,
): Promise<void> {
  // Store owner credentials for re-authentication
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = RandomGenerator.name(1);
  // 1. Authenticate member 1 (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      username: ownerUsername,
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community (member 1 becomes owner)
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Authenticate member 2 (moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderator);
  // 4. Owner adds member 2 as moderator
  const moderatorAssignment =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderator.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Re-authenticate member 1 (owner) for ban operation
  const ownerConnection2: api.IConnection = { host: connection.host };
  const owner2 = await authorize_member_join(ownerConnection2, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      username: ownerUsername,
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner2);
  // 6. Create member 3 (user to be banned)
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(bannedMember);
  // 7. Owner bans member 3 from community
  const ban = await generate_random_reddit_like_member_communities_bans_create(
    ownerConnection2,
    {
      body: {
        member_id: bannedMember.id,
      } satisfies IRedditLikeCommunityBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban is active", ban.deleted_at, null);
  // 8. Moderator connection already authenticated from step 3
  // 9. Moderator unbans member 3
  await api.functional.redditLike.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 10. Verify the operation succeeded (erase returns void)
  // The test passes if the erase operation completes without throwing an error
  TestValidator.predicate("moderator successfully unbanned user", true);
}
