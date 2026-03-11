import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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

export async function test_api_article_comments_chronological_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
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
  // Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create multiple comments with varying timestamps
  const commentCount = 5;
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    // Add delay to ensure different timestamps
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Test chronological ordering - retrieve all comments
  const allCommentsResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(allCommentsResponse);
  // Validate chronological ordering (oldest first)
  TestValidator.equals(
    "should return correct number of comments",
    allCommentsResponse.data.length,
    commentCount,
  );
  // Verify comments are sorted by creation timestamp (ascending)
  for (let i = 1; i < allCommentsResponse.data.length; i++) {
    const currentComment = allCommentsResponse.data[i];
    const previousComment = allCommentsResponse.data[i - 1];
    TestValidator.predicate(
      `comment ${i} should be created after comment ${i - 1}`,
      new Date(currentComment.created_at) >=
        new Date(previousComment.created_at),
    );
  }
  // Validate comment summary structure
  allCommentsResponse.data.forEach((comment, index) => {
    TestValidator.predicate(`comment ${index} should have id`, !!comment.id);
    TestValidator.predicate(
      `comment ${index} should have content`,
      !!comment.content,
    );
    TestValidator.predicate(
      `comment ${index} should have creation timestamp`,
      !!comment.created_at,
    );
    TestValidator.predicate(
      `comment ${index} should have author info`,
      !!comment.author && !!comment.author.id && !!comment.author.display_name,
    );
  });
  // Test pagination with limit
  const limit = 2;
  const paginatedResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          limit: limit,
          page: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResponse.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination total records should match comment count",
    paginatedResponse.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "pagination total pages should be calculated correctly",
    paginatedResponse.pagination.pages,
    Math.ceil(commentCount / limit),
  );
  // Test second page
  const secondPageResponse =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          limit: limit,
          page: 2,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page current page should be 2",
    secondPageResponse.pagination.current,
    2,
  );
  // Verify no overlap between pages
  const firstPageIds = paginatedResponse.data.map((c) => c.id);
  const secondPageIds = secondPageResponse.data.map((c) => c.id);
  firstPageIds.forEach((firstPageId) => {
    TestValidator.predicate(
      "first page comment should not appear in second page",
      !secondPageIds.includes(firstPageId),
    );
  });
}
