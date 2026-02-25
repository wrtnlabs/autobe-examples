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

export async function test_api_comment_flags_search_multiple_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Create a user to generate content
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  // Create an article as prerequisite for comment
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
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Search comment flags with multiple filters
  const searchRequest = {
    status_filter: "pending",
    flag_type_filter: "spam",
    page: 1,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
    >(),
    sort: "newest_first",
  } satisfies IDiscussionBoardCommentFlag.IRequest;
  const flagsResult =
    await api.functional.discussionBoard.admin.comments.flags.index(
      adminConnection,
      {
        commentId: comment.id,
        body: searchRequest,
      },
    );
  typia.assert(flagsResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    flagsResult.pagination.current,
    searchRequest.page,
  );
  TestValidator.equals(
    "pagination limit",
    flagsResult.pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "has valid total pages",
    flagsResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "has valid total records",
    flagsResult.pagination.records >= 0,
  );
  // Validate flag summaries structure
  flagsResult.data.forEach((flagSummary) => {
    TestValidator.predicate(
      "flag has valid id",
      !!flagSummary.id && flagSummary.id.length > 0,
    );
    TestValidator.predicate(
      "flag has valid type",
      !!flagSummary.flag_type && flagSummary.flag_type.length > 0,
    );
    TestValidator.predicate(
      "flag has valid status",
      !!flagSummary.status && flagSummary.status.length > 0,
    );
    TestValidator.predicate(
      "flag has valid creation timestamp",
      !!flagSummary.created_at && flagSummary.created_at.length > 0,
    );
    TestValidator.predicate(
      "flag has user information",
      !!flagSummary.user && !!flagSummary.user.id,
    );
    // Validate filter criteria
    TestValidator.equals(
      "flag status matches filter",
      flagSummary.status,
      searchRequest.status_filter,
    );
    TestValidator.equals(
      "flag type matches filter",
      flagSummary.flag_type,
      searchRequest.flag_type_filter,
    );
  });
}
