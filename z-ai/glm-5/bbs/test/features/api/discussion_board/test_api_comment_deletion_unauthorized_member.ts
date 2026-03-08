import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test that a member cannot delete a comment authored by another member.
 *
 * This test enforces ownership-based authorization for comment deletion:
 * 1. First member creates an article and posts a comment
 * 2. Second member (different account) attempts to delete the first member's comment
 * 3. System returns 403 Forbidden because only the comment author can delete their comment
 *
 * Authorization rule: Only the comment author or administrators can delete comments.
 * Regular members cannot delete comments authored by other members.
 */
export async function test_api_comment_deletion_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (comment author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Step 2: Create an article as the first member
  const article = await generate_random_discussion_board_member_articles_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Create a comment on the article as the first member
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      member1Connection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 4: Create second member (unauthorized user)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Step 5: Attempt to delete the comment as member2 (who didn't author it)
  // This should return 403 Forbidden because member2 is not the comment author
  await TestValidator.httpError(
    "unauthorized member cannot delete another member's comment",
    403,
    async () => {
      await api.functional.discussionBoard.member.articles.comments.erase(
        member2Connection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );
}
