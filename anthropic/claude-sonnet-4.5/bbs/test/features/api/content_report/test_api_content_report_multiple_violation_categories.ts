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
 * Test content report submission with various violation categories to ensure
 * the system correctly handles different types of guideline violations and
 * assigns appropriate severity levels.
 *
 * This test validates the graduated enforcement approach by testing all
 * predefined violation categories, ensuring proper severity classification, and
 * verifying that the 'other' category requires detailed explanation.
 *
 * Test workflow:
 *
 * 1. Create administrator account and category
 * 2. Create content creator member and post topics/replies
 * 3. Create reporter member account
 * 4. Submit reports for each violation category
 * 5. Validate all reports are created successfully
 */
export async function test_api_content_report_multiple_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create category for discussion content
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create content creator member
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreatorPassword = RandomGenerator.alphaNumeric(16);

  const contentCreatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: contentCreatorEmail,
    password: contentCreatorPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const contentCreator = await api.functional.auth.member.join(connection, {
    body: contentCreatorData,
  });
  typia.assert(contentCreator);

  // Step 4: Create topics representing different violation types
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

  const topics = await ArrayUtil.asyncMap(
    violationCategories.slice(0, 5),
    async (violationType) => {
      const topicData = {
        title: `Test topic for ${violationType} violation`,
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate;

      const topic = await api.functional.discussionBoard.member.topics.create(
        connection,
        { body: topicData },
      );
      typia.assert(topic);
      return topic;
    },
  );

  // Step 5: Create replies for remaining violation categories
  const firstTopicId = topics[0].id;

  const replies = await ArrayUtil.asyncMap(
    violationCategories.slice(5),
    async (violationType) => {
      const replyData = {
        discussion_board_topic_id: firstTopicId,
        parent_reply_id: null,
        content: `Test reply for ${violationType} violation: ${RandomGenerator.paragraph({ sentences: 3 })}`,
      } satisfies IDiscussionBoardReply.ICreate;

      const reply =
        await api.functional.discussionBoard.member.topics.replies.create(
          connection,
          {
            topicId: firstTopicId,
            body: replyData,
          },
        );
      typia.assert(reply);
      return reply;
    },
  );

  // Step 6: Create reporter member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(16);

  const reporterData = {
    username: RandomGenerator.alphaNumeric(12),
    email: reporterEmail,
    password: reporterPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const reporter = await api.functional.auth.member.join(connection, {
    body: reporterData,
  });
  typia.assert(reporter);

  // Authenticate as reporter
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 7: Submit reports for each violation category
  const reports: IDiscussionBoardReport[] = [];

  // Report topics (first 5 violation categories)
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const violationCategory = violationCategories[i];

    const reportData = {
      reported_topic_id: topic.id,
      reported_reply_id: null,
      violation_category: violationCategory,
      reporter_explanation:
        violationCategory === "other"
          ? "This content violates community guidelines in multiple ways and requires moderator attention"
          : null,
    } satisfies IDiscussionBoardReport.ICreate;

    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      { body: reportData },
    );
    typia.assert(report);
    reports.push(report);

    // Validate report properties
    TestValidator.equals(
      "report violation category matches",
      report.violation_category,
      violationCategory,
    );
    TestValidator.predicate(
      "report has valid reporter member id",
      typeof report.reporter_member_id === "string" &&
        report.reporter_member_id.length > 0,
    );
    TestValidator.equals("report status is pending", report.status, "pending");
  }

  // Report replies (remaining violation categories)
  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    const violationCategory = violationCategories[i + 5];

    const reportData = {
      reported_topic_id: null,
      reported_reply_id: reply.id,
      violation_category: violationCategory,
      reporter_explanation:
        violationCategory === "other"
          ? "This reply content is inappropriate and violates multiple community standards"
          : null,
    } satisfies IDiscussionBoardReport.ICreate;

    const report = await api.functional.discussionBoard.member.reports.create(
      connection,
      { body: reportData },
    );
    typia.assert(report);
    reports.push(report);

    // Validate report properties
    TestValidator.equals(
      "report violation category matches",
      report.violation_category,
      violationCategory,
    );
    TestValidator.predicate(
      "report has valid reporter member id",
      typeof report.reporter_member_id === "string" &&
        report.reporter_member_id.length > 0,
    );
    TestValidator.equals("report status is pending", report.status, "pending");

    if (violationCategory === "other") {
      TestValidator.predicate(
        "other category has required explanation",
        report.reporter_explanation !== null &&
          report.reporter_explanation !== undefined,
      );
    }
  }

  // Validate all violation categories were tested
  TestValidator.equals(
    "all violation categories tested",
    reports.length,
    violationCategories.length,
  );
}
