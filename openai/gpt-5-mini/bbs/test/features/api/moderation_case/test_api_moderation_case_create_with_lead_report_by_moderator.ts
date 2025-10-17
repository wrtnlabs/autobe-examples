import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_moderation_case_create_with_lead_report_by_moderator(
  connection: api.IConnection,
) {
  // 1) Register a normal user (registeredUser)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8).toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user = await api.functional.auth.registeredUser.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2) Create a thread as the registered user
  const threadTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });
  let slug = threadTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  if (!slug) slug = RandomGenerator.alphaNumeric(8).toLowerCase();

  const threadBody = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    title: threadTitle,
    slug,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // 3) Create a post in that thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 4) Create a report referencing the created post
  const reportBody = {
    reported_post_id: post.id,
    reason_code: "harassment",
    reporter_text: RandomGenerator.paragraph({ sentences: 8 }),
    reporter_anonymous: false,
    priority: "normal",
  } satisfies IEconPoliticalForumReport.ICreate;

  const report = await api.functional.econPoliticalForum.reports.create(
    connection,
    { body: reportBody },
  );
  typia.assert(report);

  // 5) Authenticate as a moderator
  const modJoinBody = {
    username: `mod_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModP@ssw0rd!",
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: modJoinBody,
  });
  typia.assert(moderator);

  // 6) Using moderator token, create a moderation case with lead_report_id
  const caseBody = {
    case_number: `CASE-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`,
    title: `Moderation for report ${report.id}`,
    assigned_moderator_id: moderator.id,
    lead_report_id: report.id,
    status: "open",
    priority: "normal",
    summary: "Case created by automated e2e test",
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      { body: caseBody },
    );
  typia.assert(createdCase);

  // Business assertions
  TestValidator.equals(
    "lead_report_id matches",
    createdCase.lead_report_id,
    report.id,
  );
  TestValidator.predicate("case id exists", !!createdCase.id);

  // 7) Edge check: creating a case with a non-existent lead_report_id should fail
  const invalidCaseBody = {
    case_number: `CASE-NONEX-${RandomGenerator.alphaNumeric(4)}`,
    title: "Invalid lead report reference",
    lead_report_id: typia.random<string & tags.Format<"uuid">>(),
    status: "open",
    priority: "normal",
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  await TestValidator.error(
    "creating case with non-existent lead_report_id should fail",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationCases.create(
        connection,
        { body: invalidCaseBody },
      );
    },
  );
}
