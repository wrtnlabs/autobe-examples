import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_thread_reply_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create first member (article author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member1);

  // Step 2: Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Create second member (parent comment author)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);

  // Step 4: Create parent comment on article
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment thread depth should be 0",
    parentComment.thread_depth,
    0,
  );
  TestValidator.equals(
    "parent comment reply count should be 0",
    parentComment.reply_count,
    0,
  );

  // Step 5: Create third member (reply author)
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member3);

  // Step 6: Create reply to parent comment
  const reply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);

  // Step 7: Validate reply properties
  TestValidator.equals(
    "reply should be linked to parent comment",
    reply.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply should have thread depth of 1",
    reply.thread_depth,
    1,
  );
  TestValidator.equals(
    "reply should belong to same article",
    reply.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reply author should be member3",
    reply.discussion_board_member_id,
    member3.id,
  );
  TestValidator.notEquals(
    "reply creation timestamp should be valid",
    reply.created_at,
    null,
  );
}
