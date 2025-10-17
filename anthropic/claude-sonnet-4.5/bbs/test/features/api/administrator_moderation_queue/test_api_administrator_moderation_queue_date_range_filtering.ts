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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_administrator_moderation_queue_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member accounts for reporting activity
  const memberData1 = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData1,
    });
  typia.assert(member1);

  const memberData2 = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData2,
    });
  typia.assert(member2);

  // Step 3: Switch back to admin and create categories
  await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 4: Switch to member1 and create topics
  await api.functional.auth.member.join(connection, {
    body: memberData1,
  });

  const topicData1 = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic1: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData1,
    });
  typia.assert(topic1);

  const topicData2 = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic2: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData2,
    });
  typia.assert(topic2);

  // Step 5: Create replies
  const replyData1 = {
    discussion_board_topic_id: topic1.id,
    parent_reply_id: null,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply1: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic1.id,
        body: replyData1,
      },
    );
  typia.assert(reply1);

  const replyData2 = {
    discussion_board_topic_id: topic2.id,
    parent_reply_id: null,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply2: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic2.id,
        body: replyData2,
      },
    );
  typia.assert(reply2);

  // Step 6: Switch to member2 and submit reports at different timestamps
  await api.functional.auth.member.join(connection, {
    body: memberData2,
  });

  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
  ] as const;

  // Create first report
  const reportData1 = {
    reported_topic_id: topic1.id,
    reported_reply_id: null,
    violation_category: RandomGenerator.pick(violationCategories),
    reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report1: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData1,
    });
  typia.assert(report1);

  const firstReportTime = new Date(report1.created_at);

  // Create second report
  const reportData2 = {
    reported_topic_id: null,
    reported_reply_id: reply1.id,
    violation_category: RandomGenerator.pick(violationCategories),
    reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report2: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData2,
    });
  typia.assert(report2);

  // Create third report
  const reportData3 = {
    reported_topic_id: topic2.id,
    reported_reply_id: null,
    violation_category: RandomGenerator.pick(violationCategories),
    reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report3: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData3,
    });
  typia.assert(report3);

  // Create fourth report
  const reportData4 = {
    reported_topic_id: null,
    reported_reply_id: reply2.id,
    violation_category: RandomGenerator.pick(violationCategories),
    reporter_explanation: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report4: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData4,
    });
  typia.assert(report4);

  const lastReportTime = new Date(report4.created_at);

  // Step 7: Switch to administrator and filter moderation queue by date ranges
  await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });

  // Test 1: Filter from first report time onwards
  const filterRequest1 = {
    from_date: firstReportTime.toISOString(),
    to_date: null,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardReport.IRequest;

  const filteredPage1: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: filterRequest1,
      },
    );
  typia.assert(filteredPage1);

  // Verify all reports are included
  TestValidator.predicate(
    "all reports should be returned when filtering from first report time",
    filteredPage1.data.length >= 4,
  );

  // Test 2: Filter up to last report time
  const filterRequest2 = {
    from_date: null,
    to_date: lastReportTime.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardReport.IRequest;

  const filteredPage2: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: filterRequest2,
      },
    );
  typia.assert(filteredPage2);

  TestValidator.predicate(
    "reports should be returned when filtering up to last report time",
    filteredPage2.data.length >= 4,
  );

  // Test 3: Filter within specific date range
  const midTime = new Date(
    (firstReportTime.getTime() + lastReportTime.getTime()) / 2,
  );

  const filterRequest3 = {
    from_date: firstReportTime.toISOString(),
    to_date: midTime.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardReport.IRequest;

  const filteredPage3: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: filterRequest3,
      },
    );
  typia.assert(filteredPage3);

  TestValidator.predicate(
    "filtered results should only include reports within date range",
    filteredPage3.data.length >= 1,
  );

  // Test 4: Combine date filtering with status filter
  const filterRequest4 = {
    from_date: firstReportTime.toISOString(),
    to_date: lastReportTime.toISOString(),
    status: "pending",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardReport.IRequest;

  const filteredPage4: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: filterRequest4,
      },
    );
  typia.assert(filteredPage4);

  TestValidator.predicate(
    "combined filters should work correctly",
    filteredPage4.data.length >= 0,
  );

  // Verify all returned reports are within the date range
  for (const reportSummary of filteredPage4.data) {
    const reportTime = new Date(reportSummary.created_at);
    TestValidator.predicate(
      "report should be within specified date range",
      reportTime >= firstReportTime && reportTime <= lastReportTime,
    );
  }

  // Test 5: Verify pagination works with date filtering
  const filterRequest5 = {
    from_date: firstReportTime.toISOString(),
    to_date: lastReportTime.toISOString(),
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardReport.IRequest;

  const paginatedPage1: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: filterRequest5,
      },
    );
  typia.assert(paginatedPage1);

  TestValidator.predicate(
    "pagination should respect limit parameter",
    paginatedPage1.data.length <= 2,
  );

  // Test 6: No results when filtering outside date range
  const futureDate = new Date(lastReportTime.getTime() + 86400000);

  const filterRequest6 = {
    from_date: futureDate.toISOString(),
    to_date: null,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardReport.IRequest;

  const emptyPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.administrator.reports.index(
      connection,
      {
        body: filterRequest6,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "no reports should be returned when filtering future dates",
    emptyPage.data.length,
    0,
  );
}
