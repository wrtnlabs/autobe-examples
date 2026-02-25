import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test comment flag search functionality when no flags match the specified criteria.
 * Scenario: Administrator searches for flags on a comment with filters that don't match
 * any existing flags (status: resolved, flag_type: harassment). Verify that empty results
 * are returned with proper pagination metadata indicating zero records.
 */
export async function test_api_comment_flags_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin authentication with isolated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Setup user authentication and create content with isolated connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create a comment on the article
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
  // 5. Search for flags with filters that won't match any existing flags
  const searchResult =
    await api.functional.discussionBoard.admin.comments.flags.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          status_filter: "resolved",
          flag_type_filter: "harassment",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Validate empty results with proper pagination metadata
  // Using manual validation since TestValidator is not available in imports
  if (searchResult.pagination.current !== 1) {
    throw new Error(
      `Expected current page to be 1, but got ${searchResult.pagination.current}`,
    );
  }
  if (searchResult.pagination.limit !== 10) {
    throw new Error(
      `Expected limit to be 10, but got ${searchResult.pagination.limit}`,
    );
  }
  if (searchResult.pagination.records !== 0) {
    throw new Error(
      `Expected records to be 0, but got ${searchResult.pagination.records}`,
    );
  }
  if (searchResult.pagination.pages !== 0) {
    throw new Error(
      `Expected pages to be 0, but got ${searchResult.pagination.pages}`,
    );
  }
  if (searchResult.data.length !== 0) {
    throw new Error(
      `Expected data array to be empty, but got ${searchResult.data.length} items`,
    );
  }
}
