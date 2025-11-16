import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test comment update with empty content and minimum length validation.
 *
 * This test validates the comment update functionality's minimum length
 * constraint which requires comments to contain at least 10 characters. It
 * tests the error handling when attempting to update comments with insufficient
 * length.
 *
 * 1. Register new member account for authentication
 * 2. Create discussion article to have content to comment on
 * 3. Create initial comment with valid content (10+ characters)
 * 4. Attempt to update comment with empty string - Should fail
 * 5. Attempt with content shorter than 10 characters - Should fail
 * 6. Update with valid content - Should succeed
 *
 * Validates API error responses and content validation rules.
 */
export async function test_api_comment_update_empty_content(
  connection: api.IConnection,
) {
  // Step 1: Register new member account
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create article for testing
  const categories = [typia.random<string & tags.Format<"uuid">>()];
  const articleData = {
    title: "Test Article for Comment Update",
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: categories,
    attachments: [],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create initial comment with valid content
  const validCommentContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const createCommentData = {
    article_id: article.id,
    content: validCommentContent,
  } satisfies IEconomicDiscussionComment.ICreate;

  const createdComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: createCommentData,
      },
    );
  typia.assert(createdComment);

  TestValidator.equals(
    "initial comment has valid content",
    createdComment.content.length,
    validCommentContent.length,
  );

  // Step 4: Attempt to update with empty content - Should fail
  await TestValidator.error(
    "comment update with empty content should fail",
    async () => {
      const updateEmptyData = {
        content: "",
      } satisfies IEconomicDiscussionComment.IUpdate;

      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: createdComment.id,
          body: updateEmptyData,
        },
      );
    },
  );

  // Step 5: Attempt with content shorter than minimum (less than 10 characters)
  await TestValidator.error(
    "comment update with 9 characters should fail",
    async () => {
      const tooShortContent = "too short"; // 9 characters
      const updateShortData = {
        content: tooShortContent,
      } satisfies IEconomicDiscussionComment.IUpdate;

      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: createdComment.id,
          body: updateShortData,
        },
      );
    },
  );

  // Step 6: Test with content at the minimum boundary (exactly 10 characters)
  const minValidContent = "min length"; // 10 characters
  const updateMinValidData = {
    content: minValidContent,
  } satisfies IEconomicDiscussionComment.IUpdate;

  const updatedComment =
    await api.functional.economicDiscussion.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: createdComment.id,
        body: updateMinValidData,
      },
    );
  typia.assert(updatedComment);

  TestValidator.equals(
    "comment updated with minimum valid length",
    updatedComment.content,
    minValidContent,
  );
  TestValidator.predicate(
    "updated comment content length is 10 characters",
    updatedComment.content.length === 10,
  );

  // Step 7: Test successful update with substantial content
  const substantialContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 6,
  });
  const updateSubstantialData = {
    content: substantialContent,
  } satisfies IEconomicDiscussionComment.IUpdate;

  const finalComment =
    await api.functional.economicDiscussion.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: createdComment.id,
        body: updateSubstantialData,
      },
    );
  typia.assert(finalComment);

  TestValidator.equals(
    "comment updated with substantial content",
    finalComment.content,
    substantialContent,
  );
  TestValidator.predicate(
    "final comment content length exceeds minimum",
    finalComment.content.length >= 10,
  );
}
