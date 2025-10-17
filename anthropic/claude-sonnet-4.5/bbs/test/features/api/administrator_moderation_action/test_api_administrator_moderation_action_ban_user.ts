import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_administrator_moderation_action_ban_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@Pass123!";
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create violating member account
  const violatorEmail = typia.random<string & tags.Format<"email">>();
  const violatorPassword = "Violator@Pass123!";
  const violatorUsername = RandomGenerator.alphaNumeric(12);

  const violatingMember = await api.functional.auth.member.join(connection, {
    body: {
      username: violatorUsername,
      email: violatorEmail,
      password: violatorPassword,
      display_name: "Violating User",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(violatingMember);

  // Step 3: Create reporting member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = "Reporter@Pass123!";
  const reporterUsername = RandomGenerator.alphaNumeric(12);

  const reportingMember = await api.functional.auth.member.join(connection, {
    body: {
      username: reporterUsername,
      email: reporterEmail,
      password: reporterPassword,
      display_name: "Reporter User",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(reportingMember);

  // Step 4: Create discussion category (as administrator)
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Politics Discussion",
          slug: "politics-discussion",
          description: "Discussion about political topics",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Violating member creates multiple violating topics
  const violatingTopics: IDiscussionBoardTopic[] = [];

  const violatingTopicData1 = {
    title: "Hate speech and personal attacks against group members",
    body: "This content contains severe violations including hate speech targeting specific ethnic groups and personal attacks against community members. This is extremely offensive and violates multiple community guidelines.",
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const violatingTopic1 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: violatingTopicData1,
    });
  typia.assert(violatingTopic1);
  violatingTopics.push(violatingTopic1);

  const violatingTopicData2 = {
    title: "Threats and doxxing of other community members",
    body: "This post contains explicit threats against other users and reveals private personal information (doxxing) including addresses and phone numbers. This is a severe violation requiring immediate action.",
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const violatingTopic2 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: violatingTopicData2,
    });
  typia.assert(violatingTopic2);
  violatingTopics.push(violatingTopic2);

  const violatingTopicData3 = {
    title: "Repeated trolling and intentional disruption",
    body: "This is another example of intentional trolling designed to disrupt civil discourse. The user has a clear pattern of deliberately inflammatory behavior designed to provoke other members.",
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const violatingTopic3 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: violatingTopicData3,
    });
  typia.assert(violatingTopic3);
  violatingTopics.push(violatingTopic3);

  // Step 6: Reporting member submits violation reports
  const reports: IDiscussionBoardReport[] = [];

  const report1 = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: violatingTopic1.id,
        violation_category: "hate_speech",
        reporter_explanation:
          "This topic contains severe hate speech targeting ethnic groups and personal attacks. This is completely unacceptable and violates community standards.",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report1);
  reports.push(report1);

  const report2 = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: violatingTopic2.id,
        violation_category: "threats",
        reporter_explanation:
          "This post contains explicit threats and doxxing. The user is revealing private information and making threatening statements.",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report2);
  reports.push(report2);

  const report3 = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: violatingTopic3.id,
        violation_category: "trolling",
        reporter_explanation:
          "This user is repeatedly trolling and intentionally disrupting discussions. Pattern of behavior shows deliberate intent to cause problems.",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report3);
  reports.push(report3);

  // Step 7: Administrator creates ban moderation action
  const moderationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: {
          target_member_id: violatingMember.id,
          related_report_id: report1.id,
          content_topic_id: violatingTopic1.id,
          action_type: "ban_user",
          reason:
            "User has committed multiple severe violations including hate speech, threats, doxxing, and repeated trolling. After reviewing reports from community members and examining the content, this user demonstrates a clear pattern of intentional guideline violations that warrant permanent ban from the platform. Evidence includes three separate topics containing hate speech against ethnic groups, explicit threats against other members, revealing private information (doxxing), and deliberate trolling behavior designed to disrupt civil discourse. This pattern of severe violations poses a risk to community safety and cannot be tolerated.",
          violation_category: "hate_speech",
          content_snapshot: violatingTopic1.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Validate the moderation action
  TestValidator.equals(
    "moderation action type is ban_user",
    moderationAction.action_type,
    "ban_user",
  );

  TestValidator.equals(
    "administrator ID is set by server",
    moderationAction.administrator_id,
    admin.id,
  );

  TestValidator.equals(
    "target member is the violator",
    moderationAction.target_member_id,
    violatingMember.id,
  );

  TestValidator.equals(
    "violation category is hate_speech",
    moderationAction.violation_category,
    "hate_speech",
  );

  TestValidator.predicate(
    "reason is comprehensive and detailed",
    moderationAction.reason.length > 100,
  );

  TestValidator.predicate(
    "content snapshot preserves evidence",
    moderationAction.content_snapshot !== null &&
      moderationAction.content_snapshot !== undefined &&
      moderationAction.content_snapshot.length > 0,
  );

  TestValidator.equals(
    "moderation action is not reversed",
    moderationAction.is_reversed,
    false,
  );

  TestValidator.equals(
    "moderator ID is null for administrator action",
    moderationAction.moderator_id,
    null,
  );
}
