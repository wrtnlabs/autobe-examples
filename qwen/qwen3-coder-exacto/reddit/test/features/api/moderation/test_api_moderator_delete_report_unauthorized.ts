import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

/**
 * Test authorization failure when non-moderator attempts to delete a report.
 *
 * This test validates that only moderators can delete reports. It creates a
 * regular user and a moderator, sets up a community, post, and report, then
 * attempts to delete the report using the regular user's credentials. The test
 * should fail with an authorization error.
 */
export async function test_api_moderator_delete_report_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user_" + RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a moderator user (first create the base user, then make them moderator)
  const moderatorEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const moderatorJoin = {
    email: moderatorEmail,
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "mod_" + RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const moderatorUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: moderatorJoin,
    });
  typia.assert(moderatorUser);

  // Step 3: Make the user a moderator
  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        community_forum_user_id: moderatorUser.id,
      } satisfies ICommunityForumCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Create a community
  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        rules: RandomGenerator.paragraph(),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.name(5),
        type: "text",
        body: RandomGenerator.paragraph(),
      } satisfies ICommunityForumCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a report on the post using the regular user
  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: {
        actor_type: "post",
        reason: "spam",
        description: RandomGenerator.paragraph({ sentences: 5 }),
        community_forum_post_id: post.id,
        href: "http://localhost/test",
        referrer: "http://localhost/previous",
      } satisfies ICommunityForumCommunityReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Switch back to regular user authentication
  await api.functional.auth.user.login(connection, {
    body: {
      email: userJoin.email,
      password: userJoin.password,
      href: "http://localhost/test",
      referrer: "http://localhost/previous",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  // Step 8: Attempt to delete the report as a regular user (should fail)
  await TestValidator.error("regular user cannot delete report", async () => {
    await api.functional.communityForum.moderator.reports.erase(connection, {
      reportId: report.id,
    });
  });
}
