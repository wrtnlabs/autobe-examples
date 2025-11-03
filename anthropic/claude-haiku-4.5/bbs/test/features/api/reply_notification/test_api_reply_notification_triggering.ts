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

export async function test_api_reply_notification_triggering(
  connection: api.IConnection,
) {
  // 1. Create member1 (article author)
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace("@", `_${RandomGenerator.alphaNumeric(4)}@`),
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member1);

  // 2. Create article by member1
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article author matches member1",
    article.author.id,
    member1.id,
  );

  // 3. Create member2 (comment author)
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace("@", `_${RandomGenerator.alphaNumeric(4)}@`),
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);

  // 4. Member2 posts top-level comment on article
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment author is member2",
    parentComment.author.id,
    member2.id,
  );
  TestValidator.equals(
    "parent comment thread_depth is 0",
    parentComment.thread_depth,
    0,
  );
  TestValidator.equals(
    "parent comment initial reply_count is 0",
    parentComment.reply_count,
    0,
  );

  // 5. Create member3 (reply author)
  const member3: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace("@", `_${RandomGenerator.alphaNumeric(4)}@`),
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member3);

  // 6. Member3 creates first reply to member2's comment
  const firstReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(firstReply);
  TestValidator.equals(
    "first reply author is member3",
    firstReply.author.id,
    member3.id,
  );
  TestValidator.equals(
    "first reply parent_comment_id matches parent",
    firstReply.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "first reply thread_depth is 1",
    firstReply.thread_depth,
    1,
  );
  TestValidator.equals(
    "first reply article matches",
    firstReply.discussion_board_article_id,
    article.id,
  );

  // 7. Verify first reply is nested under parent comment
  TestValidator.predicate(
    "first reply has parent comment reference",
    firstReply.parent_comment_id === parentComment.id,
  );

  // 8. Member3 creates second reply to same parent comment
  const secondReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(secondReply);
  TestValidator.equals(
    "second reply author is member3",
    secondReply.author.id,
    member3.id,
  );
  TestValidator.equals(
    "second reply parent_comment_id matches parent",
    secondReply.parent_comment_id,
    parentComment.id,
  );
  TestValidator.notEquals(
    "second reply is different from first reply",
    firstReply.id,
    secondReply.id,
  );

  // 9. Validate notification context - both replies should reference same article and parent comment
  TestValidator.equals(
    "both replies reference same article",
    firstReply.discussion_board_article_id,
    secondReply.discussion_board_article_id,
  );
  TestValidator.equals(
    "both replies reference same parent comment",
    firstReply.parent_comment_id,
    secondReply.parent_comment_id,
  );
  TestValidator.equals(
    "parent comment article matches created article",
    parentComment.discussion_board_article_id,
    article.id,
  );

  // 10. Validate multiple replies to same comment create separate notifications
  TestValidator.notEquals(
    "first and second replies have different IDs for separate notifications",
    firstReply.id,
    secondReply.id,
  );
  TestValidator.equals(
    "both replies are replies to same parent comment",
    firstReply.parent_comment_id,
    secondReply.parent_comment_id,
  );
}
