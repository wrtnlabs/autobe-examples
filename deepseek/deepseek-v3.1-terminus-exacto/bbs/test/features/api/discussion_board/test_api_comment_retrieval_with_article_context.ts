import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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

export async function test_api_comment_retrieval_with_article_context(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create article with valid section ID (using a randomly generated UUID since sections API not available)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Retrieve the specific comment using member connection
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // Validate comment properties
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(new Date(retrievedComment.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(new Date(retrievedComment.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedComment.deleted_at,
    null,
  );
  // Validate author details
  TestValidator.equals(
    "author ID matches",
    retrievedComment.author.id,
    member.id,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedComment.author.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "author bio matches",
    retrievedComment.author.bio,
    member.bio,
  );
  // Validate article summary
  TestValidator.equals(
    "article ID matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedComment.article.title,
    article.title,
  );
  TestValidator.equals(
    "article author ID matches",
    retrievedComment.article.author.id,
    member.id,
  );
  TestValidator.predicate(
    "article has valid created_at",
    () => !isNaN(new Date(retrievedComment.article.created_at).getTime()),
  );
}
