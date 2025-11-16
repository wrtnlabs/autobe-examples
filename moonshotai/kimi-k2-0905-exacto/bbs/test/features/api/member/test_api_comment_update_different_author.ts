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
 * Test that a member cannot update another member's comment.
 *
 * This test validates proper authorization in the economic discussion platform
 * by ensuring that comments can only be updated by their original authors. The
 * test follows this sequence:
 *
 * 1. Create first member account and authenticate
 * 2. Create an article with the first member
 * 3. Create a comment on that article with the first member
 * 4. Create second member account and authenticate
 * 5. Attempt to update the first member's comment using the second member
 * 6. Verify that the unauthorized update attempt fails with an error
 *
 * This ensures that the comment system properly validates ownership before
 * allowing updates, maintaining content integrity and preventing unauthorized
 * modifications to other users' contributions.
 */
export async function test_api_comment_update_different_author(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberData = {
    username: RandomGenerator.alphabets(10).toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const firstMemberAuth = await api.functional.auth.member.join(connection, {
    body: firstMemberData,
  });
  typia.assert(firstMemberAuth);

  // Step 2: Create an article with the first member
  const categoryIds = [typia.random<string & tags.Format<"uuid">>()];
  const articleData = {
    title: RandomGenerator.name(4),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: categoryIds,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create a comment on the article with the first member
  const commentData = {
    article_id: article.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 8,
    }),
  } satisfies IEconomicDiscussionComment.ICreate;

  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 4: Create second member account
  const secondMemberData = {
    username: RandomGenerator.alphabets(10).toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const secondMemberAuth = await api.functional.auth.member.join(connection, {
    body: secondMemberData,
  });
  typia.assert(secondMemberAuth);

  // Step 5: Attempt to update the first member's comment as the second member
  const updatedCommentData = {
    content: "This comment was maliciously updated by someone else",
  } satisfies IEconomicDiscussionComment.IUpdate;

  // This should fail - second member shouldn't be able to update first member's comment
  await TestValidator.error(
    "second member cannot update first member's comment",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: updatedCommentData,
        },
      );
    },
  );
}
