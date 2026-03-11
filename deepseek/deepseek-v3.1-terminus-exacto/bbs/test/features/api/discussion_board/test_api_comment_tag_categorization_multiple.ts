import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test adding multiple categorization tags to a comment.
 * Member creates article and comment, then updates the comment with multiple
 * relevant tags for better content organization and discovery.
 */
export async function test_api_comment_tag_categorization_multiple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Create a comment on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // 4. Update comment with multiple tags
  const tags = [
    RandomGenerator.alphabets(5),
    RandomGenerator.alphabets(6),
    RandomGenerator.alphabets(7),
  ];
  const updatedComment =
    await api.functional.discussionBoard.articles.comments.tags.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          tags: tags,
        } satisfies IDiscussionBoardCommentTag.IRequest,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate the response contains the comment with updated information
  // Using manual validation since TestValidator may not be available
  if (updatedComment.id !== comment.id) {
    throw new Error(
      `Comment ID mismatch: expected ${comment.id}, got ${updatedComment.id}`,
    );
  }
  if (updatedComment.content !== comment.content) {
    throw new Error(`Comment content mismatch`);
  }
  if (updatedComment.author.id !== comment.author.id) {
    throw new Error(
      `Author ID mismatch: expected ${comment.author.id}, got ${updatedComment.author.id}`,
    );
  }
}
