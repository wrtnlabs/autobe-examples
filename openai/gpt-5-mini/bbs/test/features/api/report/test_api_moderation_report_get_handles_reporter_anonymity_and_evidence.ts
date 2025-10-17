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

/**
 * Verify moderator view of a report includes reporter anonymity and preserves
 * reporter-provided evidence-like metadata (validated via reporter_text).
 *
 * Business flow:
 *
 * 1. Administrator joins and creates a category.
 * 2. Registered user (author) joins, creates a thread and a post in that category.
 * 3. The same user files a report against the post with reporter_anonymous=true
 *    and a reporter_text that serves as evidence metadata.
 * 4. A moderator joins and requests the moderator-scoped report detail.
 *
 * Validations:
 *
 * - Typia.assert on all non-void API responses
 * - The moderator-facing report has reporter_anonymous === true
 * - The reported_post_id matches the created post's id
 * - Reporter_text preserved in the moderator view
 */
export async function test_api_moderation_report_get_handles_reporter_anonymity_and_evidence(
  connection: api.IConnection,
) {
  // 1) Administrator: join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassw0rd!",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  // 2) Admin: create a category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: "Test category for moderation report flow",
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

  // 3) Registered user (author) joins
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorJoin = {
    username: RandomGenerator.alphabets(8),
    email: authorEmail,
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: authorJoin,
    });
  typia.assert(author);

  // 4) Author: create a thread in the category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // 5) Author: create a post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 6) Create a report against the post with reporter_anonymous = true
  const reportPayload = {
    reported_post_id: post.id,
    reason_code: "harassment",
    reporter_text:
      "Contains coordinated harassment and hateful slurs; see attached notes.",
    reporter_anonymous: true,
    // NOTE: Do NOT include reporter_id; server derives reporter identity from session when required.
  } satisfies IEconPoliticalForumReport.ICreate;

  const createdReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: reportPayload,
    });
  typia.assert(createdReport);

  // 7) Moderator: join (switches connection to moderator token)
  const modEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoin = {
    username: RandomGenerator.alphabets(8),
    email: modEmail,
    password: "ModeratorPassw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoin,
    });
  typia.assert(moderator);

  // 8) Moderator: fetch the report by id
  const reportForModerator: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.moderator.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(reportForModerator);

  // 9) Business validations
  TestValidator.equals(
    "reported_post_id matches created post",
    reportForModerator.reported_post_id,
    post.id,
  );

  TestValidator.equals(
    "reporter_anonymous flag preserved",
    reportForModerator.reporter_anonymous,
    true,
  );

  TestValidator.equals(
    "reporter_text preserved",
    reportForModerator.reporter_text,
    reportPayload.reporter_text,
  );
}
