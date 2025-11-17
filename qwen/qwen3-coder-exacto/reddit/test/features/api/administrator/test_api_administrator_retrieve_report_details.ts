import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_administrator_retrieve_report_details(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      username: RandomGenerator.name(1),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 2: Create an administrator user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      community_forum_user_id: userJoin.id,
      role: "system_admin",
    } satisfies ICommunityForumCommunityAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // Step 3: Login as regular user to create content
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  // Step 4: Create a community
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 4 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post = await api.functional.communityForum.user.posts.create(
    connection,
    {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies ICommunityForumCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create a report on the post
  const reportReason = RandomGenerator.pick([
    "spam",
    "harassment",
    "misinformation",
    "copyright",
    "violence",
    "hate_speech",
    "other",
  ] as const);
  const report = await api.functional.communityForum.user.reports.create(
    connection,
    {
      body: {
        actor_type: "post",
        reason: reportReason,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        community_forum_post_id: post.id,
        href: "http://localhost:3000/report",
        referrer: "http://localhost:3000/post",
      } satisfies ICommunityForumCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Login as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/login",
    } satisfies ICommunityForumCommunityAdministrator.ILogin,
  });

  // Step 8: Retrieve report details as administrator
  const retrievedReport =
    await api.functional.communityForum.administrator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 9: Validate that all expected fields are present in the retrieved report
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporting user ID matches",
    retrievedReport.community_forum_user_id,
    userJoin.id,
  );
  TestValidator.equals(
    "actor type is correct",
    retrievedReport.actor_type,
    "post",
  );
  TestValidator.equals("reason matches", retrievedReport.reason, reportReason);
  TestValidator.equals(
    "description matches",
    retrievedReport.description,
    report.description,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    () => retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    () => retrievedReport.updated_at !== undefined,
  );
}
