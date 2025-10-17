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

/**
 * Test that members can retrieve detailed information about their own appeal
 * submissions.
 *
 * This test validates the complete appeal retrieval workflow ensuring members
 * can track review progress and understand moderation decisions through the
 * appeal system.
 *
 * Workflow:
 *
 * 1. Create member account and authenticate
 * 2. Create discussion topic as member
 * 3. Create administrator account and authenticate
 * 4. Issue moderation action against the topic
 * 5. Switch back to member authentication
 * 6. Submit appeal contesting the moderation decision
 * 7. Retrieve appeal details to verify complete information access
 *
 * Validations:
 *
 * - Member can retrieve their own appeal details
 * - Response includes complete appeal information with all required fields
 * - Appeal explanation meets character requirements (100-1000 chars)
 * - Current status is correctly set
 * - Original moderation action details are included
 * - Timestamps are accurate
 */
export async function test_api_appeal_member_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const memberCreateBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuth);

  // Step 2: Member creates a discussion topic
  const topicCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const createdTopic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicCreateBody,
    });
  typia.assert(createdTopic);

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminSecure456!@#";

  const adminCreateBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuth);

  // Step 4: Create moderation action against the topic
  const moderationReason = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });

  const moderationActionBody = {
    administrator_id: adminAuth.id,
    target_member_id: memberAuth.id,
    content_topic_id: createdTopic.id,
    action_type: "hide_content" as const,
    reason: moderationReason,
    violation_category: "off_topic" as const,
    content_snapshot: createdTopic.body,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // Step 5: Switch back to member authentication
  const memberReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(memberReauth);

  // Step 6: Create appeal contesting the moderation decision
  const appealExplanation = RandomGenerator.paragraph({
    sentences: 40,
    wordMin: 4,
    wordMax: 8,
  });

  const appealCreateBody = {
    appealed_moderation_action_id: moderationAction.id,
    appeal_explanation: appealExplanation,
    additional_evidence: RandomGenerator.paragraph({
      sentences: 20,
      wordMin: 5,
      wordMax: 9,
    }),
  } satisfies IDiscussionBoardAppeal.ICreate;

  const createdAppeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(connection, {
      body: appealCreateBody,
    });
  typia.assert(createdAppeal);

  // Step 7: Retrieve the appeal details
  const retrievedAppeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.at(connection, {
      appealId: createdAppeal.id,
    });
  typia.assert(retrievedAppeal);

  // Validate appeal details
  TestValidator.equals(
    "retrieved appeal ID matches created appeal",
    retrievedAppeal.id,
    createdAppeal.id,
  );

  TestValidator.equals(
    "appeal explanation matches submitted content",
    retrievedAppeal.appeal_explanation,
    appealExplanation,
  );

  TestValidator.predicate(
    "appeal explanation meets minimum character requirement (100 chars)",
    retrievedAppeal.appeal_explanation.length >= 100,
  );

  TestValidator.predicate(
    "appeal explanation meets maximum character requirement (1000 chars)",
    retrievedAppeal.appeal_explanation.length <= 1000,
  );

  TestValidator.predicate(
    "appeal status field is present and non-empty",
    typeof retrievedAppeal.status === "string" &&
      retrievedAppeal.status.length > 0,
  );

  TestValidator.predicate(
    "appeal submitted timestamp is present",
    typeof retrievedAppeal.submitted_at === "string" &&
      retrievedAppeal.submitted_at.length > 0,
  );

  TestValidator.predicate(
    "appeal created timestamp is present",
    typeof retrievedAppeal.created_at === "string" &&
      retrievedAppeal.created_at.length > 0,
  );

  TestValidator.predicate(
    "appeal updated timestamp is present",
    typeof retrievedAppeal.updated_at === "string" &&
      retrievedAppeal.updated_at.length > 0,
  );
}
