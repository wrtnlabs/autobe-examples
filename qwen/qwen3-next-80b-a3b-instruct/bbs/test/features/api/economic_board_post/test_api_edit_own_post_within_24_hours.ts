import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_edit_own_post_within_24_hours(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  // For testing purposes, use a valid bcrypt hash pattern matching the requirements
  const memberPasswordHash =
    "$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: memberPasswordHash,
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for the post
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a published post
  const postSubject = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const createdPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: postSubject,
        content: postContent,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(createdPost);
  TestValidator.equals(
    "post status should be published",
    createdPost.status,
    "published",
  );

  // Validate created_at is a valid date-time format
  const created_at = new Date(createdPost.created_at);
  TestValidator.predicate(
    "created_at should be valid date-time",
    !isNaN(created_at.getTime()),
  );

  // 4. Edit the post within 24 hours
  // For test stability, simulate the update immediately after creation (within 24 hours)
  const updatedSubject = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 5,
    wordMax: 9,
  });
  const editedPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.update(connection, {
      postId: createdPost.id,
      body: {
        subject: updatedSubject,
        content: updatedContent,
      } satisfies IEconomicBoardPost.IUpdate,
    });
  typia.assert(editedPost);

  // 5. Validate the post modification
  TestValidator.equals(
    "post subject should be updated",
    editedPost.subject,
    updatedSubject,
  );
  TestValidator.equals(
    "post content should be updated",
    editedPost.content,
    updatedContent,
  );
  TestValidator.predicate(
    "post should be marked as edited",
    editedPost.edited === true,
  );
  TestValidator.equals(
    "post status should remain published",
    editedPost.status,
    "published",
  );

  // Ensure updated_at is after created_at (within 24 hours)
  const updated_at = new Date(editedPost.updated_at);
  TestValidator.predicate(
    "updated_at should be after created_at",
    updated_at > created_at,
  );
  // Validate this update happened within 24 hours (86400000 milliseconds)
  TestValidator.predicate(
    "update should be within 24 hours",
    updated_at.getTime() - created_at.getTime() <= 86400000,
  );

  // Validate edited_at is populated with a date-time and matches updated_at
  TestValidator.predicate(
    "edited_at should be defined",
    editedPost.edited_at !== null && editedPost.edited_at !== undefined,
  );
  const edited_at = new Date(editedPost.edited_at!);
  TestValidator.predicate(
    "edited_at should be after created_at",
    edited_at >= created_at,
  );
  TestValidator.predicate(
    "edited_at should match updated_at",
    edited_at.getTime() === updated_at.getTime(),
  );

  // Validate that author_hash remains unchanged
  TestValidator.equals(
    "author_hash should remain the same",
    editedPost.author_hash,
    createdPost.author_hash,
  );

  // Validate that admin_id and moderation_reason remain unchanged (null)
  TestValidator.equals(
    "admin_id should remain null",
    editedPost.admin_id,
    createdPost.admin_id,
  );
  TestValidator.equals(
    "moderation_reason should remain null",
    editedPost.moderation_reason,
    createdPost.moderation_reason,
  );

  // Validate reply_count remains unchanged
  TestValidator.equals(
    "reply_count should remain unchanged",
    editedPost.reply_count,
    createdPost.reply_count,
  );

  // Validate that the rest of the state hasn't changed unexpectedly
  TestValidator.equals(
    "topic id should remain unchanged",
    editedPost.economic_board_topics_id,
    createdPost.economic_board_topics_id,
  );
}
