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

export async function test_api_comment_flags_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test cannot be properly implemented without flag creation capabilities.
  // The current API only provides flag search functionality but no flag creation endpoints.
  // Therefore, this test can only validate empty result pagination behavior.
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article using user connection
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
  // Create a single comment on the article
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
  // Test pagination with limit=10 - should return empty results since no flags exist
  const firstPage =
    await api.functional.discussionBoard.admin.comments.flags.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(firstPage);
  // Test pagination with limit=25 - should return empty results since no flags exist
  const secondPage =
    await api.functional.discussionBoard.admin.comments.flags.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(secondPage);
  // Test edge case - page beyond available results
  const emptyPage =
    await api.functional.discussionBoard.admin.comments.flags.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(emptyPage);
  // Validate pagination metadata for empty results
  TestValidator.equals("first page pagination metadata", firstPage.pagination, {
    current: 1,
    limit: 10,
    records: 0,
    pages: 0,
  });
  TestValidator.equals(
    "second page pagination metadata",
    secondPage.pagination,
    {
      current: 1,
      limit: 25,
      records: 0,
      pages: 0,
    },
  );
  TestValidator.equals("empty page pagination metadata", emptyPage.pagination, {
    current: 100,
    limit: 10,
    records: 0,
    pages: 0,
  });
  // Validate empty data arrays
  TestValidator.predicate(
    "first page has empty array",
    firstPage.data.length === 0,
  );
  TestValidator.predicate(
    "second page has empty array",
    secondPage.data.length === 0,
  );
  TestValidator.predicate(
    "empty page has empty array",
    emptyPage.data.length === 0,
  );
}
