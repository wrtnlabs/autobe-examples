import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_appeal_detail_with_resolution_data(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminData = {
    username: RandomGenerator.alphaNumeric(8),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Switch to member context and create discussion topic
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Step 4: Switch to administrator context and create moderation action
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const moderationActionData = {
    administrator_id: admin.id,
    target_member_id: member.id,
    content_topic_id: topic.id,
    action_type: "hide_content",
    reason:
      "This topic violates community guidelines regarding offensive language and inappropriate content for the discussion board.",
    violation_category: "offensive_language",
    content_snapshot: topic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 5: Switch back to member context and create appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const appealData = {
    appealed_moderation_action_id: moderationAction.id,
    appeal_explanation: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 20,
      sentenceMax: 30,
    }),
    additional_evidence:
      "I believe the moderation decision was unfair because my topic was discussing legitimate economic policy issues without any offensive language. The content was factual and respectful.",
  } satisfies IDiscussionBoardAppeal.ICreate;

  const appeal = await api.functional.discussionBoard.member.appeals.create(
    connection,
    {
      body: appealData,
    },
  );
  typia.assert(appeal);

  // Step 6: Retrieve appeal details to verify appeal submission data is preserved
  const retrievedAppeal =
    await api.functional.discussionBoard.member.appeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(retrievedAppeal);

  // Validate appeal structure and submission data preservation
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal explanation preserved",
    retrievedAppeal.appeal_explanation,
    appealData.appeal_explanation,
  );
  TestValidator.equals(
    "additional evidence preserved",
    retrievedAppeal.additional_evidence,
    appealData.additional_evidence,
  );
  TestValidator.predicate(
    "appeal has status",
    typeof retrievedAppeal.status === "string" &&
      retrievedAppeal.status.length > 0,
  );
  TestValidator.predicate(
    "submitted timestamp exists",
    typeof retrievedAppeal.submitted_at === "string" &&
      retrievedAppeal.submitted_at.length > 0,
  );
  TestValidator.predicate(
    "created timestamp exists",
    typeof retrievedAppeal.created_at === "string" &&
      retrievedAppeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    typeof retrievedAppeal.updated_at === "string" &&
      retrievedAppeal.updated_at.length > 0,
  );
}
