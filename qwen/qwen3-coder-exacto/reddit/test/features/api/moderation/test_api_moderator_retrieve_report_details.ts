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

export async function test_api_moderator_retrieve_report_details(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase() + RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community by the user
  const communityCreate = {
    name:
      RandomGenerator.name(2)
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    slug:
      RandomGenerator.name(1).toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 4 }),
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
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    type: "text",
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Create a report for the post
  const reportCreate = {
    actor_type: "post",
    reason: "spam",
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
    community_forum_post_id: post.id,
    href: "http://localhost/test/report",
    referrer: "http://localhost/test/post",
  } satisfies ICommunityForumCommunityReport.ICreate;

  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: reportCreate,
    });
  typia.assert(report);

  // Step 5: Create a moderator account using the same user
  const moderatorCreate = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 6: Login as moderator to get proper authentication
  const moderatorLogin = {
    email: userJoin.email,
    password: userJoin.password,
    href: "http://localhost/test/moderator/login",
    referrer: "http://localhost/test/moderator/join",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  const moderatorAuth: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });
  typia.assert(moderatorAuth);

  // Step 7: Retrieve the report details as a moderator
  const retrievedReport: ICommunityForumCommunityReport =
    await api.functional.communityForum.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Validate that the retrieved report matches the created report
  TestValidator.equals(
    "retrieved report ID matches",
    retrievedReport.id,
    report.id,
  );
  TestValidator.equals(
    "retrieved report type matches",
    retrievedReport.actor_type,
    "post",
  );
  TestValidator.equals(
    "retrieved report reason matches",
    retrievedReport.reason,
    "spam",
  );
  TestValidator.predicate(
    "retrieved report has created timestamp",
    () =>
      retrievedReport.created_at !== undefined &&
      retrievedReport.created_at !== null,
  );
  TestValidator.predicate(
    "retrieved report has updated timestamp",
    () =>
      retrievedReport.updated_at !== undefined &&
      retrievedReport.updated_at !== null,
  );
}
