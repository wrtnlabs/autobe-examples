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

export async function test_api_comment_flag_admin_review_multiple_flags(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
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
  // Since we don't have article/comment creation APIs available, we'll test the admin flag review
  // functionality with the assumption that flags already exist in the system
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Admin reviews flags with different status filters
  const pendingResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          flag_type: undefined,
          status: "pending",
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(pendingResponse);
  const underReviewResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          flag_type: undefined,
          status: "under_review",
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(underReviewResponse);
  const resolvedResponse =
    await api.functional.discussionBoard.admin.articles.comments.flags.index(
      adminConnection,
      {
        articleId,
        commentId,
        body: {
          flag_type: undefined,
          status: "resolved",
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
      },
    );
  typia.assert(resolvedResponse);
  // Validate pagination structure for all responses
  for (const [responseType, response] of [
    ["pending", pendingResponse],
    ["under_review", underReviewResponse],
    ["resolved", resolvedResponse],
  ] as const) {
    TestValidator.equals(
      `${responseType} pagination structure`,
      typeof response.pagination,
      "object",
    );
    TestValidator.predicate(
      `${responseType} has current page`,
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      `${responseType} has limit`,
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${responseType} has records count`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${responseType} has pages count`,
      response.pagination.pages >= 0,
    );
    // Validate flag summary structure
    TestValidator.equals(
      `${responseType} data is array`,
      Array.isArray(response.data),
      true,
    );
    // If there are flags, validate their structure
    if (response.data.length > 0) {
      const flag = response.data[0];
      TestValidator.equals(
        `${responseType} flag has id`,
        typeof flag.id,
        "string",
      );
      TestValidator.equals(
        `${responseType} flag has type`,
        typeof flag.flag_type,
        "string",
      );
      TestValidator.equals(
        `${responseType} flag has status`,
        typeof flag.status,
        "string",
      );
      TestValidator.equals(
        `${responseType} flag has timestamp`,
        typeof flag.created_at,
        "string",
      );
      TestValidator.equals(
        `${responseType} flag has user`,
        typeof flag.user,
        "object",
      );
      // Validate user summary structure
      TestValidator.equals(
        `${responseType} user has id`,
        typeof flag.user.id,
        "string",
      );
      TestValidator.equals(
        `${responseType} user has display name`,
        typeof flag.user.display_name,
        "string",
      );
      TestValidator.predicate(
        `${responseType} user has bio`,
        typeof flag.user.bio === "string" || typeof flag.user.bio === "object",
      );
      TestValidator.equals(
        `${responseType} user has created_at`,
        typeof flag.user.created_at,
        "string",
      );
      TestValidator.equals(
        `${responseType} user has updated_at`,
        typeof flag.user.updated_at,
        "string",
      );
      // Reviewer may be null for pending flags, present for reviewed flags
      if (flag.reviewer !== null && flag.reviewer !== undefined) {
        TestValidator.equals(
          `${responseType} reviewer has id`,
          typeof flag.reviewer.id,
          "string",
        );
        TestValidator.equals(
          `${responseType} reviewer has email`,
          typeof flag.reviewer.email,
          "string",
        );
        TestValidator.equals(
          `${responseType} reviewer has display name`,
          typeof flag.reviewer.display_name,
          "string",
        );
        TestValidator.equals(
          `${responseType} reviewer has timestamp`,
          typeof flag.reviewer.created_at,
          "string",
        );
      }
    }
  }
  // Test flag type filtering
  const flagTypes = ["spam", "harassment", "inappropriate"] as const;
  for (const flagType of flagTypes) {
    const filteredResponse =
      await api.functional.discussionBoard.admin.articles.comments.flags.index(
        adminConnection,
        {
          articleId,
          commentId,
          body: {
            flag_type: flagType,
            status: undefined,
            page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardCommentFlag.IRequest,
        },
      );
    typia.assert(filteredResponse);
    TestValidator.equals(
      `flag type ${flagType} response structure`,
      typeof filteredResponse.pagination,
      "object",
    );
    TestValidator.equals(
      `flag type ${flagType} data is array`,
      Array.isArray(filteredResponse.data),
      true,
    );
  }
}