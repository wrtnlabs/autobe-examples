import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_article_comments_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: Section creation requires admin privileges which are not available in current setup
  // For this test, we'll assume a section exists and use a valid section ID pattern
  // In a real scenario, we would need to create a section first or use an existing one
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create more comments than default page size (20)
  const commentCount = 25; // More than default limit of 20
  const comments = await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardComment.ICreate,
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // Test default pagination (page 1, limit 20)
  const defaultPage =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate default pagination metadata
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  TestValidator.equals(
    "default page records",
    defaultPage.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "default page pages",
    defaultPage.pagination.pages,
    Math.ceil(commentCount / 20),
  );
  TestValidator.equals("default page data count", defaultPage.data.length, 20);
  // Test second page with default limit
  const secondPage =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate second page metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "second page pages",
    secondPage.pagination.pages,
    Math.ceil(commentCount / 20),
  );
  TestValidator.equals("second page data count", secondPage.data.length, 5); // 25 total - 20 on first page = 5 on second
  // Test different page size (10 per page)
  const customLimitPage =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(customLimitPage);
  // Validate custom limit pagination metadata
  TestValidator.equals(
    "custom limit page current",
    customLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit page limit",
    customLimitPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit page records",
    customLimitPage.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "custom limit page pages",
    customLimitPage.pagination.pages,
    Math.ceil(commentCount / 10),
  );
  TestValidator.equals(
    "custom limit page data count",
    customLimitPage.data.length,
    10,
  );
  // Test edge case: page beyond available pages
  const beyondPage =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 10, // Way beyond available pages
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(beyondPage);
  // Validate beyond page returns empty data but correct metadata
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    10,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 10);
  TestValidator.equals(
    "beyond page records",
    beyondPage.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "beyond page pages",
    beyondPage.pagination.pages,
    Math.ceil(commentCount / 10),
  );
  TestValidator.equals("beyond page data count", beyondPage.data.length, 0);
  // Test comments are sorted by oldest first (created_at ascending)
  const allCommentsPage =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: commentCount, // Get all comments
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(allCommentsPage);
  // Verify chronological order (oldest first) - comments should be in ascending order
  for (let i = 1; i < allCommentsPage.data.length; i++) {
    const current = new Date(allCommentsPage.data[i].created_at);
    const previous = new Date(allCommentsPage.data[i - 1].created_at);
    TestValidator.predicate(
      `comment ${i} should be after or equal to comment ${i - 1}`,
      current >= previous,
    );
  }
}
