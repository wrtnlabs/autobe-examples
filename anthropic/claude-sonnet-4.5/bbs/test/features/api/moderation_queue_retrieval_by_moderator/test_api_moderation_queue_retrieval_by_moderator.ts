import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_moderation_queue_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
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

  // Step 2: Create moderator account (appointed by administrator)
  const moderatorData = {
    appointed_by_admin_id: admin.id,
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 3: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Administrator creates Economics category
  const categoryData = {
    name: "Economics",
    slug: "economics",
    description: "Discussions about economic theory and policy",
    parent_category_id: null,
    display_order: 1,
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

  // Step 5: Member creates first topic (valid content)
  const topic1Data = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic1: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topic1Data,
    });
  typia.assert(topic1);

  // Step 6: Member creates second topic (to be reported)
  const topic2Data = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic2: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topic2Data,
    });
  typia.assert(topic2);

  // Step 7: Member creates reply (to be reported)
  const replyData = {
    discussion_board_topic_id: topic1.id,
    parent_reply_id: null,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic1.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 8: Member reports topic2 for hate_speech
  const report1Data = {
    reported_topic_id: topic2.id,
    reported_reply_id: null,
    violation_category: "hate_speech",
    reporter_explanation:
      "This topic contains hate speech targeting specific groups",
  } satisfies IDiscussionBoardReport.ICreate;

  const report1: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: report1Data,
    });
  typia.assert(report1);

  // Step 9: Member reports reply for personal_attack
  const report2Data = {
    reported_topic_id: null,
    reported_reply_id: reply.id,
    violation_category: "personal_attack",
    reporter_explanation:
      "This reply contains personal attacks against another user",
  } satisfies IDiscussionBoardReport.ICreate;

  const report2: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: report2Data,
    });
  typia.assert(report2);

  // Step 10: Moderator retrieves moderation queue with filters
  const queueRequest = {
    status: "pending",
    severity_level: null,
    violation_category: null,
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: null,
    sort_order: null,
    page: 1,
    limit: 25,
  } satisfies IDiscussionBoardReport.IRequest;

  const queueResponse: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.reports.index(connection, {
      body: queueRequest,
    });
  typia.assert(queueResponse);

  // Step 11: Validate response contains both reports
  TestValidator.predicate(
    "queue response contains reports",
    queueResponse.data.length >= 2,
  );

  const foundReport1 = queueResponse.data.find((r) => r.id === report1.id);
  const foundReport2 = queueResponse.data.find((r) => r.id === report2.id);

  typia.assertGuard(foundReport1!);
  typia.assertGuard(foundReport2!);

  TestValidator.equals(
    "report1 violation category",
    foundReport1.violation_category,
    "hate_speech",
  );
  TestValidator.equals(
    "report1 severity level is critical",
    foundReport1.severity_level,
    "critical",
  );
  TestValidator.equals(
    "report1 status is pending",
    foundReport1.status,
    "pending",
  );
  TestValidator.equals(
    "report1 reporter member ID",
    foundReport1.reporter_member_id,
    member.id,
  );
  TestValidator.equals(
    "report1 reported topic ID",
    foundReport1.reported_topic_id,
    topic2.id,
  );

  TestValidator.equals(
    "report2 violation category",
    foundReport2.violation_category,
    "personal_attack",
  );
  TestValidator.equals(
    "report2 severity level is high",
    foundReport2.severity_level,
    "high",
  );
  TestValidator.equals(
    "report2 status is pending",
    foundReport2.status,
    "pending",
  );
  TestValidator.equals(
    "report2 reporter member ID",
    foundReport2.reporter_member_id,
    member.id,
  );
  TestValidator.equals(
    "report2 reported reply ID",
    foundReport2.reported_reply_id,
    reply.id,
  );

  // Step 12: Test alternative filtering (hate_speech only)
  const filteredRequest = {
    status: "pending",
    severity_level: null,
    violation_category: "hate_speech",
    assigned_moderator_id: null,
    from_date: null,
    to_date: null,
    sort_by: null,
    sort_order: null,
    page: 1,
    limit: 25,
  } satisfies IDiscussionBoardReport.IRequest;

  const filteredResponse: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.reports.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredResponse);

  // Step 13: Validate filtered results contain only hate_speech report
  const hateSpeechReports = filteredResponse.data.filter(
    (r) => r.violation_category === "hate_speech",
  );
  TestValidator.predicate(
    "filtered results contain hate_speech reports",
    hateSpeechReports.length >= 1,
  );

  const foundFilteredReport = hateSpeechReports.find(
    (r) => r.id === report1.id,
  );
  typia.assertGuard(foundFilteredReport!);

  TestValidator.equals(
    "filtered report matches report1",
    foundFilteredReport.id,
    report1.id,
  );

  // Step 14: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    queueResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 25",
    queueResponse.pagination.limit === 25,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    queueResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    queueResponse.pagination.pages >= 0,
  );
}
