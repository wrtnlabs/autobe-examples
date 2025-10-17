import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardAdmin";

/**
 * E2E test for admin list retrieval with search and pagination.
 *
 * - Admin join to authenticate, retrieve auth token
 * - Use auth token to request filtered, paginated admin list
 * - Validate response data and pagination info
 * - Check unauthorized access rejection
 */
export async function test_api_discussion_board_admin_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinData: IDiscussionBoardAdmin.IJoin = {
    email: adminEmail,
    password: "1234",
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinData,
    });
  typia.assert(admin);

  // 2. Valid paginated admin list request
  const requestBody: IDiscussionBoardDiscussionBoardAdmin.IRequest = {
    page: 1,
    limit: 10,
    search: adminEmail.slice(0, adminEmail.indexOf("@")) || adminEmail, // partial search by local part
    order_by: "email",
    order_direction: "asc",
  } satisfies IDiscussionBoardDiscussionBoardAdmin.IRequest;

  const listResp: IPageIDiscussionBoardDiscussionBoardAdmin.ISummary =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(listResp);

  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page > 0",
    listResp.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    listResp.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    listResp.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    listResp.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= current",
    listResp.pagination.pages >= listResp.pagination.current,
  );

  // 4. Validate data array size <= limit
  TestValidator.predicate(
    "data length <= pagination limit",
    listResp.data.length <= listResp.pagination.limit,
  );

  // 5. Validate each admin summary's properties
  for (const adminSummary of listResp.data) {
    typia.assert(adminSummary);
    // Basic property checks
    TestValidator.predicate(
      "adminSummary.id is uuid",
      /^[0-9a-fA-F\-]{36}$/.test(adminSummary.id),
    );
    TestValidator.predicate(
      "adminSummary.email is string",
      typeof adminSummary.email === "string",
    );
    TestValidator.predicate(
      "adminSummary.display_name is string",
      typeof adminSummary.display_name === "string",
    );
    TestValidator.predicate(
      "adminSummary.created_at is ISO string",
      !isNaN(Date.parse(adminSummary.created_at)),
    );
    TestValidator.predicate(
      "adminSummary.updated_at is ISO string",
      !isNaN(Date.parse(adminSummary.updated_at)),
    );
  }

  // 6. Negative test: call without authentication token should fail
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin list request should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardAdmins.index(
        unauthenticatedConn,
        {
          body: requestBody,
        },
      );
    },
  );

  // 7. Edge case: search that yields empty results
  const emptySearchReq: IDiscussionBoardDiscussionBoardAdmin.IRequest = {
    page: 1,
    limit: 10,
    search: "no-such-admin-email", // unlikely to exist
    order_by: "email",
    order_direction: "asc",
  } satisfies IDiscussionBoardDiscussionBoardAdmin.IRequest;
  const emptySearchResp =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.index(
      connection,
      {
        body: emptySearchReq,
      },
    );
  typia.assert(emptySearchResp);
  TestValidator.equals(
    "empty search yields no data",
    emptySearchResp.data.length,
    0,
  );

  // 8. Edge case: paginated request beyond last page
  const overPageReq: IDiscussionBoardDiscussionBoardAdmin.IRequest = {
    page: listResp.pagination.pages + 100,
    limit: 10,
    search: null,
    order_by: "email",
    order_direction: "asc",
  } satisfies IDiscussionBoardDiscussionBoardAdmin.IRequest;
  const overPageResp =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.index(
      connection,
      {
        body: overPageReq,
      },
    );
  typia.assert(overPageResp);
  TestValidator.equals(
    "page beyond last yields no data",
    overPageResp.data.length,
    0,
  );
}
