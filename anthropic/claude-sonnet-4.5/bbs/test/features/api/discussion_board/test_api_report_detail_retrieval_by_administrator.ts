import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test administrator retrieval of detailed content report information.
 *
 * This test validates the complete workflow for administrators to access
 * comprehensive information about content reports submitted by members. The
 * workflow includes creating an administrator account, setting up discussion
 * content (category, topic, reply), having a member report the reply for
 * guideline violations, and then verifying the administrator can retrieve
 * detailed report information.
 *
 * Steps:
 *
 * 1. Create administrator account
 * 2. Create discussion category
 * 3. Create member account
 * 4. Member creates discussion topic
 * 5. Member posts reply to topic
 * 6. Member reports the reply for violations
 * 7. Administrator retrieves detailed report information
 * 8. Validate report contains complete information
 */
export async function test_api_report_detail_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!@#";
  const adminCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Administrator creates discussion category
  const categoryCreateData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      { body: categoryCreateData },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member123!@#";
  const memberCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateData,
  });
  typia.assert(member);

  // Step 4: Member creates discussion topic
  const topicCreateData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicCreateData },
  );
  typia.assert(topic);

  // Step 5: Member posts reply to topic
  const replyCreateData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyCreateData,
      },
    );
  typia.assert(reply);

  // Step 6: Member reports the reply for violations
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
    "off_topic",
    "threats",
    "doxxing",
    "trolling",
    "other",
  ] as const;
  const selectedViolation = RandomGenerator.pick(violationCategories);

  const reportCreateData = {
    reported_topic_id: null,
    reported_reply_id: reply.id,
    violation_category: selectedViolation,
    reporter_explanation:
      selectedViolation === "other"
        ? RandomGenerator.paragraph({ sentences: 5 })
        : RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    { body: reportCreateData },
  );
  typia.assert(report);

  // Step 7: Administrator retrieves detailed report information
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const retrievedReport =
    await api.functional.discussionBoard.administrator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 8: Validate report contains complete information
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter member ID matches",
    retrievedReport.reporter_member_id,
    member.id,
  );
  TestValidator.equals(
    "reported reply ID matches",
    retrievedReport.reported_reply_id,
    reply.id,
  );
  TestValidator.equals(
    "violation category matches",
    retrievedReport.violation_category,
    selectedViolation,
  );
  TestValidator.predicate(
    "severity level is a non-empty string",
    typeof retrievedReport.severity_level === "string" &&
      retrievedReport.severity_level.length > 0,
  );
  TestValidator.predicate(
    "status is a non-empty string",
    typeof retrievedReport.status === "string" &&
      retrievedReport.status.length > 0,
  );
  TestValidator.predicate(
    "created timestamp is valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/.test(
      retrievedReport.created_at,
    ),
  );
  TestValidator.predicate(
    "updated timestamp is valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/.test(
      retrievedReport.updated_at,
    ),
  );

  if (reportCreateData.reporter_explanation) {
    TestValidator.predicate(
      "reporter explanation exists when provided",
      retrievedReport.reporter_explanation !== null &&
        retrievedReport.reporter_explanation !== undefined,
    );
  }
}
