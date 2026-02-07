import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
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

export async function test_api_comment_flag_filter_by_type_status(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate random article and comment IDs
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Note: Since there's no API endpoint provided to create actual flags,
  // we can only test the filtering functionality with the assumption that
  // the system has some existing flags or handles non-existent data gracefully
  // Test filtering by flag_type='spam' and status='pending'
  const spamPendingResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          flag_type: "spam",
          status: "pending",
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(spamPendingResponse);
  // Test filtering by flag_type='harassment' and status='under_review'
  const harassmentReviewResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          flag_type: "harassment",
          status: "under_review",
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(harassmentReviewResponse);
  // Test filtering by flag_type='inappropriate' without status filter
  const inappropriateResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          flag_type: "inappropriate",
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(inappropriateResponse);
  // Test filtering by status='pending' without flag_type filter
  const pendingResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          status: "pending",
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Test edge case: non-existent combination
  const nonExistentResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          flag_type: "non_existent_type",
          status: "non_existent_status",
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(nonExistentResponse);
  // Test empty result set (no filters)
  const emptyResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    emptyResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    emptyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    emptyResponse.pagination.pages >= 0,
  );
}
