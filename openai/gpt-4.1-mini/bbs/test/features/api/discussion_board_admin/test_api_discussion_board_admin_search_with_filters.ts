import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";

export async function test_api_discussion_board_admin_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Admin registration - join admin user to obtain authenticated context
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "strongPassword123!",
    nickname: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Use admin token automatically set in connection by SDK

  // 3. Perform filtered search queries with pagination
  // Creating various search requests

  // Basic Pagination only
  const defaultPaginationRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdmin.IRequest;

  const searchByEmailRequest = {
    page: 1,
    limit: 5,
    email: admin.email,
  } satisfies IDiscussionBoardAdmin.IRequest;

  const searchByNicknameRequest = {
    page: 1,
    limit: 3,
    nickname: admin.nickname.substring(0, 2),
  } satisfies IDiscussionBoardAdmin.IRequest;

  // Search for active admins only (deleted_at is null)
  const activeAdminsRequest = {
    page: 1,
    limit: 5,
    deleted_at_is_null: true,
  } satisfies IDiscussionBoardAdmin.IRequest;

  // Search with created_at date range
  const createdAtFrom = new Date();
  createdAtFrom.setDate(createdAtFrom.getDate() - 30); // 30 days ago
  const dateRangeRequest = {
    page: 1,
    limit: 10,
    created_at_from: createdAtFrom.toISOString(),
    created_at_to: new Date().toISOString(),
  } satisfies IDiscussionBoardAdmin.IRequest;

  // General search
  const generalSearchRequest = {
    page: 1,
    limit: 7,
    search: admin.nickname.substring(0, 1),
  } satisfies IDiscussionBoardAdmin.IRequest;

  // Helper: call search API and validate common response features
  async function callSearchAndValidate(
    requestBody: IDiscussionBoardAdmin.IRequest,
  ) {
    const response: IPageIDiscussionBoardAdmin.ISummary =
      await api.functional.discussionBoard.admin.discussionBoardAdmins.index(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(response);

    // Validate pagination info
    TestValidator.predicate(
      "pagination current is positive",
      response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages is positive or zero",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records is positive or zero",
      response.pagination.records >= 0,
    );

    // Validate all returned admins fit filtering criteria
    for (const adminSummary of response.data) {
      typia.assert(adminSummary);

      if (requestBody.email !== undefined) {
        TestValidator.predicate(
          "admin email contains filter",
          adminSummary.email.includes(requestBody.email),
        );
      }

      if (requestBody.nickname !== undefined) {
        TestValidator.predicate(
          "admin nickname contains filter",
          adminSummary.nickname.includes(requestBody.nickname),
        );
      }

      if (requestBody.deleted_at_is_null === true) {
        TestValidator.equals(
          "admin deleted_at is null",
          adminSummary.deleted_at,
          null,
        );
      }

      if (requestBody.created_at_from !== undefined) {
        TestValidator.predicate(
          "admin created_at after created_at_from",
          new Date(adminSummary.created_at) >=
            new Date(requestBody.created_at_from),
        );
      }

      if (requestBody.created_at_to !== undefined) {
        TestValidator.predicate(
          "admin created_at before created_at_to",
          new Date(adminSummary.created_at) <=
            new Date(requestBody.created_at_to),
        );
      }

      if (requestBody.search !== undefined) {
        TestValidator.predicate(
          "admin email or nickname contains search",
          adminSummary.email.includes(requestBody.search) ||
            adminSummary.nickname.includes(requestBody.search),
        );
      }
    }
  }

  // 4. Call and validate various searches
  await callSearchAndValidate(defaultPaginationRequest);
  await callSearchAndValidate(searchByEmailRequest);
  await callSearchAndValidate(searchByNicknameRequest);
  await callSearchAndValidate(activeAdminsRequest);
  await callSearchAndValidate(dateRangeRequest);
  await callSearchAndValidate(generalSearchRequest);

  // 5. Unauthorized access test
  // Create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated users cannot perform admin search",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardAdmins.index(
        unauthenticatedConnection,
        { body: defaultPaginationRequest },
      );
    },
  );
}
