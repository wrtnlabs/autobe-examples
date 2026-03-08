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

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Setup: Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  // 3. Setup: Create a comment on the article
  const originalComment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(originalComment);
  // Store original timestamps
  const originalCreatedAt = originalComment.created_at;
  // 4. Execute: Update the comment with new content
  const updatedContent = RandomGenerator.paragraph({ sentences: 10 });
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: originalComment.id,
        body: {
          content: updatedContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validations
  TestValidator.equals(
    "content matches",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals("id unchanged", updatedComment.id, originalComment.id);
  TestValidator.equals(
    "created_at preserved",
    updatedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedComment.updated_at,
    originalComment.updated_at,
  );
  TestValidator.equals(
    "author id matches",
    updatedComment.author.id,
    member.id,
  );
  TestValidator.equals(
    "article id matches",
    updatedComment.article.id,
    article.id,
  );
}
