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
 * Test retrieval failure when comment exists but doesn't belong to the specified article.
 * Validates foreign key constraint validation by ensuring comments can only be retrieved
 * through their correct parent article.
 */
export async function test_api_comment_retrieval_comment_belongs_to_different_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
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
  typia.assert(memberAAuthorized);
  // 2. Create Article A using Member A's connection
  const articleA =
    await generate_random_discussion_board_member_articles_create(
      memberAConnection,
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
  typia.assert(articleA);
  // 3. Create and authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
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
  typia.assert(memberBAuthorized);
  // 4. Create Article B using Member B's connection
  const articleB =
    await generate_random_discussion_board_member_articles_create(
      memberBConnection,
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
  typia.assert(articleB);
  // 5. Create a comment on Article A using Member A's connection
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberAConnection,
      {
        params: {
          articleId: articleA.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Attempt to retrieve the comment using Article B's ID and the comment's ID
  // This should fail since the comment belongs to Article A, not Article B
  await TestValidator.error(
    "comment retrieval fails when comment doesn't belong to specified article",
    async () => {
      await api.functional.discussionBoard.articles.comments.at(
        memberAConnection,
        {
          articleId: articleB.id,
          commentId: comment.id,
        },
      );
    },
  );
  // 7. Verify that both articles exist independently by retrieving them
  // Article A should exist and be accessible through the comment retrieval
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(
      memberAConnection,
      {
        articleId: articleA.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "retrieved comment matches original",
    retrievedComment.id,
    comment.id,
  );
  // 8. Verify Article B exists by attempting to create a comment on it (which should succeed)
  const articleBComment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberBConnection,
      {
        params: {
          articleId: articleB.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(articleBComment);
  TestValidator.equals(
    "article B comment has correct article ID",
    articleBComment.article.id,
    articleB.id,
  );
}
