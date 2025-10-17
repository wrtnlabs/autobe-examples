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
 * Test content report submission for discussion topic violations.
 *
 * This test validates the workflow for members to submit content reports
 * flagging discussion topics that violate community guidelines. The test
 * ensures the reporting system correctly handles topic-level violations and
 * distinguishes between topic reports and reply reports.
 *
 * Workflow:
 *
 * 1. Administrator creates account and authenticates
 * 2. Administrator creates a discussion category
 * 3. First member creates account and authenticates
 * 4. First member creates a discussion topic
 * 5. Second member creates account and authenticates
 * 6. Second member submits report flagging the topic for violations
 * 7. Validate report creation with correct properties
 */
export async function test_api_content_report_submission_for_topic_violation(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates account and authenticates
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Administrator creates a discussion category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: First member creates account and authenticates
  const firstMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });
  typia.assert(firstMember);

  // Step 4: First member creates a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Second member creates account and authenticates
  const secondMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondMemberData,
    });
  typia.assert(secondMember);

  // Step 6: Second member submits report flagging the topic
  const violationCategories = ["spam", "misinformation", "off_topic"] as const;
  const violationCategory = RandomGenerator.pick(violationCategories);

  const reportData = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: violationCategory,
    reporter_explanation: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 7: Validate report creation with correct properties
  TestValidator.equals(
    "report has reporter member ID",
    report.reporter_member_id,
    secondMember.id,
  );
  TestValidator.equals(
    "report references correct topic",
    report.reported_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "report has no reply ID",
    report.reported_reply_id,
    null,
  );
  TestValidator.equals(
    "report has correct violation category",
    report.violation_category,
    violationCategory,
  );
  TestValidator.predicate(
    "report has severity level assigned",
    typeof report.severity_level === "string" &&
      report.severity_level.length > 0,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate(
    "report has creation timestamp",
    typeof report.created_at === "string",
  );
}
