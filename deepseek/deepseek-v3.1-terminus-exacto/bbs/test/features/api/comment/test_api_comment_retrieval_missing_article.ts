import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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

export async function test_api_comment_retrieval_missing_article(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid but nonexistent article ID
  const nonexistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve comments for the nonexistent article
  const requestBody: IDiscussionBoardComment.IRequest = {
    page: 1,
    limit: 10,
  };
  // The endpoint may either return empty results or throw an error
  // Test both possibilities appropriately
  try {
    const response =
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: nonexistentArticleId,
        body: requestBody,
      });
    typia.assert(response);
    // If successful, validate the empty response structure
    TestValidator.equals(
      "pagination structure exists",
      typeof response.pagination,
      "object",
    );
    TestValidator.equals(
      "data should be empty array for nonexistent article",
      response.data.length,
      0,
    );
    TestValidator.equals(
      "current page should be 1",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "limit should match request",
      response.pagination.limit,
      10,
    );
    TestValidator.equals(
      "total records should be 0",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "total pages should be 0",
      response.pagination.pages,
      0,
    );
  } catch (error) {
    // If it throws an error, validate it's an appropriate HTTP error
    TestValidator.httpError(
      "should return appropriate error for nonexistent article",
      [404, 400], // Not Found or Bad Request
      () => {
        throw error;
      },
    );
  }
}
