import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Administrator retrieval of detailed report information for a topic violation.
 *
 * This test validates that administrators can access comprehensive report
 * details when the violation involves a discussion topic rather than a reply,
 * ensuring the moderation system handles both content types correctly.
 *
 * Test workflow:
 *
 * 1. Create administrator account for accessing administrative report review
 * 2. Create category for organizing discussion content
 * 3. Create member account who will create and report content
 * 4. Member creates a discussion topic
 * 5. Member reports the topic itself for violating community guidelines
 * 6. Administrator retrieves the detailed report information for the topic
 *    violation
 */
export async function test_api_report_detail_topic_violation_review(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create category for topic organization
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 4: Member creates a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Member reports the topic for guideline violations
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

  const reportData = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: selectedViolation,
    reporter_explanation:
      selectedViolation === "other"
        ? RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })
        : null,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Administrator retrieves the detailed report information
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const retrievedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.administrator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Validation: Report correctly references the reported topic
  TestValidator.equals(
    "report ID matches created report",
    retrievedReport.id,
    report.id,
  );

  TestValidator.equals(
    "reported topic ID matches created topic",
    retrievedReport.reported_topic_id,
    topic.id,
  );

  TestValidator.equals(
    "reported reply ID is null for topic violations",
    retrievedReport.reported_reply_id,
    null,
  );

  TestValidator.equals(
    "reporter member ID matches member who submitted report",
    retrievedReport.reporter_member_id,
    member.id,
  );

  TestValidator.equals(
    "violation category matches submitted category",
    retrievedReport.violation_category,
    selectedViolation,
  );

  TestValidator.predicate(
    "report has valid severity level",
    ["critical", "high", "medium", "low"].includes(
      retrievedReport.severity_level,
    ),
  );

  TestValidator.predicate(
    "report status reflects initial state",
    ["pending", "under_review"].includes(retrievedReport.status),
  );

  TestValidator.predicate(
    "report has creation timestamp",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );

  TestValidator.predicate(
    "report has update timestamp",
    retrievedReport.updated_at !== null &&
      retrievedReport.updated_at !== undefined,
  );
}
