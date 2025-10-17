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
 * Test content report submission for discussion reply violation.
 *
 * This test validates the complete workflow for a member to submit a content
 * report flagging a discussion reply that violates community guidelines. The
 * test demonstrates the community-driven moderation system where authenticated
 * members can report inappropriate content to trigger the moderation workflow.
 *
 * Test workflow:
 *
 * 1. Create administrator account and authenticate
 * 2. Administrator creates a discussion category
 * 3. Create first member account (content creator)
 * 4. First member creates a discussion topic
 * 5. First member posts a reply to the topic
 * 6. Create second member account (reporter)
 * 7. Second member submits content report flagging the reply
 * 8. Validate report creation and business logic
 */
export async function test_api_content_report_submission_for_reply_violation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminData = {
    username: RandomGenerator.alphaNumeric(15) satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">,
    email:
      `admin_${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
        tags.Format<"email">,
    password: `Admin${RandomGenerator.alphaNumeric(8)}!@#` satisfies string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Administrator creates a discussion category
  const categoryData = {
    name: `Economics ${RandomGenerator.alphaNumeric(6)}` satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<50>,
    slug: `economics-${RandomGenerator.alphaNumeric(6)}` satisfies string &
      tags.Pattern<"^[a-z0-9-]+$">,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    parent_category_id: null,
    display_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (content creator)
  const member1Data = {
    username: RandomGenerator.alphaNumeric(15) satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">,
    email:
      `member1_${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
        tags.Format<"email">,
    password: `Member1${RandomGenerator.alphaNumeric(8)}!@#` satisfies string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    display_name: RandomGenerator.name(2) satisfies string &
      tags.MinLength<1> &
      tags.MaxLength<50>,
  } satisfies IDiscussionBoardMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1);

  // Step 4: First member creates a discussion topic
  const topicData = {
    title:
      `Discussion on ${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 })}` satisfies string &
        tags.MinLength<10> &
        tags.MaxLength<200>,
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }) satisfies string & tags.MinLength<20> & tags.MaxLength<50000>,
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Step 5: First member posts a reply to the topic
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }) satisfies string & tags.MinLength<1> & tags.MaxLength<10000>,
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 6: Create second member account (reporter)
  const member2Data = {
    username: RandomGenerator.alphaNumeric(15) satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">,
    email:
      `member2_${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
        tags.Format<"email">,
    password: `Member2${RandomGenerator.alphaNumeric(8)}!@#` satisfies string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    display_name: RandomGenerator.name(2) satisfies string &
      tags.MinLength<1> &
      tags.MaxLength<50>,
  } satisfies IDiscussionBoardMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2);

  // Step 7: Second member submits content report flagging the reply
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
    reported_topic_id: null,
    reported_reply_id: reply.id,
    violation_category: selectedViolation,
    reporter_explanation:
      selectedViolation === "other"
        ? RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 })
        : RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: reportData,
    },
  );
  typia.assert(report);

  // Step 8: Validate report creation and business logic
  TestValidator.equals(
    "reporter matches authenticated member",
    report.reporter_member_id,
    member2.id,
  );
  TestValidator.equals(
    "reported reply ID matches",
    report.reported_reply_id,
    reply.id,
  );
  TestValidator.equals(
    "reported topic ID is null",
    report.reported_topic_id,
    null,
  );
  TestValidator.equals(
    "violation category matches submitted",
    report.violation_category,
    selectedViolation,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
}
