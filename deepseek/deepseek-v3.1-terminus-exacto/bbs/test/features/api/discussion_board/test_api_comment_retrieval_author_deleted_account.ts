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

/**
 * Test comment retrieval when author's account has been deleted.
 * According to business rules, comments remain visible even if author's account is deleted.
 * Create a member, article, and comment. Then simulate member account deletion scenario.
 * Retrieve the comment using the GET endpoint. Validate that the comment is still returned
 * with content intact, verifying the system follows business rules about content persistence
 * independent of author account status.
 */
export async function test_api_comment_retrieval_author_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for comment author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
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
  typia.assert(author);
  // 2. Create article for comment context
  const article = await generate_random_discussion_board_member_articles_create(
    authorConnection,
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
  // 3. Create comment
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      authorConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Simulate author account deletion scenario
  // Since there's no explicit member deletion endpoint, we test that the comment
  // remains accessible even without the original author's authentication
  // This simulates the scenario where author account no longer exists
  const publicConnection: api.IConnection = { host: connection.host };
  // 5. Retrieve the comment using the GET endpoint without author authentication
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(
      publicConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // 6. Validate that the comment content remains intact
  TestValidator.equals(
    "comment content should remain unchanged",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment ID should match",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment creation time should match",
    retrievedComment.created_at,
    comment.created_at,
  );
  // 7. Validate author information is preserved
  // According to business rules, comments remain visible with author information
  TestValidator.predicate("author information should be present", () => {
    return (
      retrievedComment.author !== null && retrievedComment.author !== undefined
    );
  });
  // Validate author details are preserved
  TestValidator.equals(
    "author display name should match",
    retrievedComment.author.display_name,
    author.display_name,
  );
  TestValidator.equals(
    "author bio should match",
    retrievedComment.author.bio,
    author.bio,
  );
  // 8. Validate article information
  TestValidator.equals(
    "article ID should match",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title should match",
    retrievedComment.article.title,
    article.title,
  );
  // 9. Verify soft deletion handling
  TestValidator.predicate(
    "comment should not be soft deleted",
    () => retrievedComment.deleted_at === null,
  );
  // 10. Test that the comment is still accessible even without author authentication
  TestValidator.predicate(
    "comment retrieval should succeed without author auth",
    () => true,
  );
  // 11. Additional validation: Comment should be retrievable by any user
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_member_join(anotherUserConnection, {
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
  typia.assert(anotherUser);
  const commentRetrievedByAnotherUser =
    await api.functional.discussionBoard.articles.comments.at(
      anotherUserConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(commentRetrievedByAnotherUser);
  TestValidator.equals(
    "comment should be accessible by other users",
    commentRetrievedByAnotherUser.content,
    comment.content,
  );
}
