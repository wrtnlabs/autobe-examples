import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test public accessibility of community moderator lists for transparency.
 *
 * This test validates that moderator information is publicly accessible without
 * authentication, supporting the principle that community members and visitors
 * should understand who governs a community before participating.
 *
 * Steps:
 *
 * 1. Create a member account and establish a community
 * 2. Create additional moderator accounts
 * 3. Assign moderators to the community with various permissions
 * 4. Retrieve moderator list without authentication (unauthenticated connection)
 * 5. Verify complete moderator information is accessible including usernames and
 *    permissions
 */
export async function test_api_community_moderator_list_public_transparency(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community (member becomes primary moderator)
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create additional moderator accounts
  const moderatorCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
  >() satisfies number as number;
  const moderators: IRedditLikeModerator.IAuthorized[] =
    await ArrayUtil.asyncRepeat(moderatorCount, async (index) => {
      const modData = {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate;

      const mod: IRedditLikeModerator.IAuthorized =
        await api.functional.auth.moderator.join(connection, { body: modData });
      typia.assert(mod);
      return mod;
    });

  // Step 4: Assign moderators to the community
  const assignedModerators: IRedditLikeCommunityModerator[] =
    await ArrayUtil.asyncMap(moderators, async (mod) => {
      const permissions = ["manage_posts", "manage_comments", "access_reports"];
      const assignmentData = {
        moderator_id: mod.id,
        permissions: permissions.join(","),
      } satisfies IRedditLikeCommunityModerator.ICreate;

      const assignment: IRedditLikeCommunityModerator =
        await api.functional.redditLike.moderator.communities.moderators.create(
          connection,
          {
            communityId: community.id,
            body: assignmentData,
          },
        );
      typia.assert(assignment);
      return assignment;
    });

  // Step 5: Create unauthenticated connection (no auth headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 6: Retrieve moderator list without authentication
  const moderatorList: IPageIRedditLikeCommunityModerator =
    await api.functional.redditLike.communities.moderators.index(
      unauthConnection,
      { communityId: community.id },
    );
  typia.assert(moderatorList);

  // Step 7: Verify moderator list is accessible and contains complete information
  TestValidator.predicate(
    "moderator list should be accessible without authentication",
    moderatorList.data.length > 0,
  );

  TestValidator.equals(
    "total moderators should include primary moderator plus assigned moderators",
    moderatorList.data.length,
    assignedModerators.length + 1,
  );

  TestValidator.predicate(
    "primary moderator should be present in the list",
    moderatorList.data.some((mod) => mod.is_primary === true),
  );

  TestValidator.predicate(
    "all assigned moderators should be present",
    assignedModerators.every((assigned) =>
      moderatorList.data.some(
        (mod) => mod.moderator_id === assigned.moderator_id,
      ),
    ),
  );

  TestValidator.predicate(
    "moderator information should include permissions",
    moderatorList.data.every(
      (mod) =>
        typeof mod.permissions === "string" && mod.permissions.length > 0,
    ),
  );
}
