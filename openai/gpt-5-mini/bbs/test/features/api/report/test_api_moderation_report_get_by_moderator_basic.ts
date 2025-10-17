import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_moderation_report_get_by_moderator_basic(
  connection: api.IConnection,
) {
  // 1) Administrator: register and create a category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassw0rd!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  const categoryBody = {
    code: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: "E2E test category for moderation report",
    is_moderated: true,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 2) Registered user: register, create thread and post
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: userEmail,
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user = await api.functional.auth.registeredUser.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);

  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 8 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 3) Create a public report against the post (reporter is the registered user)
  const reportCreateBody = {
    reported_post_id: post.id,
    reason_code: "harassment",
    reporter_text: "Automated E2E report: please triage",
    reporter_anonymous: true,
  } satisfies IEconPoliticalForumReport.ICreate;

  const createdReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  // 4) Create a moderator account (becomes active caller token)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: moderatorEmail,
    password: "ModPassw0rd!",
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderator);

  // 5) As moderator, retrieve the report details
  const reportFromModerator: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.moderator.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(reportFromModerator);

  // Business-level validations
  TestValidator.equals(
    "retrieved report id matches created report",
    reportFromModerator.id,
    createdReport.id,
  );

  TestValidator.equals(
    "retrieved report reason matches",
    reportFromModerator.reason_code,
    createdReport.reason_code,
  );

  TestValidator.equals(
    "retrieved reported_post_id matches",
    reportFromModerator.reported_post_id,
    createdReport.reported_post_id,
  );

  TestValidator.predicate(
    "reporter_anonymous flag preserved",
    reportFromModerator.reporter_anonymous === true,
  );

  // Moderator-visible triage fields should be present (may be null initially)
  TestValidator.predicate(
    "triage fields presence",
    reportFromModerator.triaged_at !== undefined ||
      reportFromModerator.status !== undefined ||
      reportFromModerator.moderation_case_id !== undefined,
  );
}
