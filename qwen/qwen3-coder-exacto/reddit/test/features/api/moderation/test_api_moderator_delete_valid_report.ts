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

export async function test_api_moderator_delete_valid_report(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(4),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(4),
    slug:
      RandomGenerator.name(1).toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(4),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    rules: RandomGenerator.content({ paragraphs: 1 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "text",
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Report the post
  const reportCreate = {
    actor_type: "post",
    reason: "spam",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    community_forum_post_id: post.id,
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/previous",
  } satisfies ICommunityForumCommunityReport.ICreate;

  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: reportCreate,
    });
  typia.assert(report);

  // Step 5: Create a moderator
  const moderatorJoin = {
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.com`,
    password: "moderator123",
    username:
      "mod_" +
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(4),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const moderatorUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: moderatorJoin,
    });
  typia.assert(moderatorUser);

  const moderatorCreate = {
    community_forum_user_id: moderatorUser.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 6: Login as moderator
  const moderatorLogin = {
    email: moderatorJoin.email,
    password: moderatorJoin.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  await api.functional.auth.moderator.login(connection, {
    body: moderatorLogin,
  });

  // Step 7: Delete the report as moderator
  await api.functional.communityForum.moderator.reports.erase(connection, {
    reportId: report.id,
  });

  // Verification: Attempting to access the deleted report should fail
  // Note: Since the API doesn't provide a way to get a single report by ID,
  // we cannot directly verify the deletion. In a real test, we might check
  // that the report no longer appears in a list of reports or that a specific
  // endpoint for retrieving reports by ID returns a 404.
}
