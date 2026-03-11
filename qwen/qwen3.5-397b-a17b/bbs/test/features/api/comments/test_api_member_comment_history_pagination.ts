import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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

/**
 * Test member comment history pagination functionality.
 *
 * This test verifies the pagination behavior of the member comment history endpoint:
 * 1. Creates a member account and authenticates
 * 2. Creates an article for the member to comment on
 * 3. Posts 25 comments to test pagination boundaries
 * 4. Retrieves page 1 (default: page=1, limit=20) and validates:
 *    - Pagination metadata (current=1, limit=20, records=25, pages=2)
 *    - Returns exactly 20 comments
 *    - Comments sorted oldest-first by created_at
 *    - Each comment contains required fields (id, content, author, article, created_at)
 * 5. Retrieves page 2 and validates:
 *    - Returns remaining 5 comments
 *    - Pagination metadata updated correctly (current=2, pages=2)
 */
export async function test_api_member_comment_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create an article for the member to comment on
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Create 25 comments to test pagination (20 per page = 2 pages)
  const TOTAL_COMMENTS = 25;
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < TOTAL_COMMENTS; i++) {
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 10,
            }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
    // Small delay to ensure different created_at timestamps for sorting
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 4. Retrieve page 1 with default pagination (page=1, limit=20)
  const page1Result =
    await api.functional.discussionBoard.members.comments.index(
      memberConnection,
      {
        memberId: memberAuth.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_asc",
        },
      },
    );
  typia.assert(page1Result);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 20);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    TOTAL_COMMENTS,
  );
  TestValidator.equals("page 1 total pages", page1Result.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 20);
  // Validate comments are sorted oldest-first
  for (let i = 1; i < page1Result.data.length; i++) {
    TestValidator.predicate(
      `comment ${i} created after comment ${i - 1}`,
      new Date(page1Result.data[i].created_at).getTime() >=
        new Date(page1Result.data[i - 1].created_at).getTime(),
    );
  }
  // Validate each comment's author matches the member and article reference
  for (const comment of page1Result.data) {
    TestValidator.equals(
      "comment author matches member",
      comment.author.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "comment author display name",
      comment.author.display_name,
      memberAuth.display_name,
    );
    TestValidator.equals(
      "comment article matches",
      comment.article.id,
      article.id,
    );
  }
  // 5. Retrieve page 2 to verify remaining comments
  const page2Result =
    await api.functional.discussionBoard.members.comments.index(
      memberConnection,
      {
        memberId: memberAuth.id,
        body: {
          page: 2,
          limit: 20,
          sort: "created_at_asc",
        },
      },
    );
  typia.assert(page2Result);
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 20);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    TOTAL_COMMENTS,
  );
  TestValidator.equals("page 2 total pages", page2Result.pagination.pages, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 5);
  // Validate page 2 comments also belong to the member and article
  for (const comment of page2Result.data) {
    TestValidator.equals(
      "page 2 comment author matches member",
      comment.author.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "page 2 comment article matches",
      comment.article.id,
      article.id,
    );
  }
  // Verify continuity: last comment of page 1 is before first comment of page 2
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    TestValidator.predicate(
      "page 2 comments are after page 1 comments",
      new Date(page2Result.data[0].created_at).getTime() >=
        new Date(
          page1Result.data[page1Result.data.length - 1].created_at,
        ).getTime(),
    );
  }
}
