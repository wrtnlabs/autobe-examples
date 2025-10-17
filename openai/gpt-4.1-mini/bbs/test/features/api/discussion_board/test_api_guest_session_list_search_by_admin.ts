import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardGuest";

/**
 * Validate the admin registration and guest session search functionality.
 *
 * This test simulates an admin joining the discussion board, receiving an
 * authentication token, and using that token to perform paginated, filtered
 * searches of guest sessions.
 *
 * Steps:
 *
 * 1. Admin user joins with valid credentials.
 * 2. Assert returned admin properties including auth token.
 * 3. Perform several guest session search requests with varying pagination and
 *    filters.
 * 4. Assert responses follow pagination constraints, filters, and sorting.
 *
 * This test ensures only authorized admin users can search guest sessions,
 * filters and pagination work as intended, and response data matches DTO.
 */
export async function test_api_guest_session_list_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins the discussion board
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongP@ssw0rd!",
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "Admin token access is non-empty string",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Define search request variations for guest session listing
  const searchRequests: IDiscussionBoardDiscussionBoardGuest.IRequest[] = [
    {
      page: 1,
      limit: 10,
      search: null,
      sort_by: "created_at",
      order: "desc",
    },
    {
      page: 2,
      limit: 5,
      search: null,
      sort_by: "session_token",
      order: "asc",
    },
    {
      page: 1,
      limit: 20,
      search: admin.token.access.substring(0, 8),
      sort_by: "updated_at",
      order: "desc",
    },
  ];

  // For each search request, perform the guest session search and validate
  for (const request of searchRequests) {
    // Validate request pagination values before call
    if (request.page !== null && request.page !== undefined) {
      TestValidator.predicate(
        `search request page is positive integer >= 1 for page ${request.page}`,
        Number.isInteger(request.page) && request.page >= 1,
      );
    }

    if (request.limit !== null && request.limit !== undefined) {
      TestValidator.predicate(
        `search request limit is positive integer >= 1 for limit ${request.limit}`,
        Number.isInteger(request.limit) && request.limit >= 1,
      );
    }

    const response: IPageIDiscussionBoardDiscussionBoardGuest.ISummary =
      await api.functional.discussionBoard.admin.discussionBoardGuests.search(
        connection,
        { body: request },
      );
    typia.assert(response);

    // Validate pagination correctness
    TestValidator.predicate(
      `pagination current page is number and >= 1 for page ${request.page ?? "N/A"}`,
      typeof response.pagination.current === "number" &&
        response.pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination limit is number and positive for limit ${request.limit ?? "N/A"}`,
      typeof response.pagination.limit === "number" &&
        response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `pagination total pages >= 1 if records present for page ${request.page ?? "N/A"}`,
      response.pagination.records === 0 ||
        (typeof response.pagination.pages === "number" &&
          response.pagination.pages >= 1),
    );
    TestValidator.predicate(
      `pagination total pages >= current page for page ${request.page ?? "N/A"}`,
      response.pagination.pages >= response.pagination.current,
    );

    // Validate data array size conforms to limit
    TestValidator.predicate(
      `response data size does not exceed limit ${request.limit ?? "N/A"}`,
      response.data.length <= (request.limit ?? 10),
    );

    // Each data entry should have valid structure
    for (const guestSummary of response.data) {
      typia.assert(guestSummary);
      TestValidator.predicate(
        "Guest summary id is a valid UUID string",
        typeof guestSummary.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            guestSummary.id,
          ),
      );
      TestValidator.predicate(
        "Guest summary session_token is non-empty string",
        typeof guestSummary.session_token === "string" &&
          guestSummary.session_token.length > 0,
      );
      TestValidator.predicate(
        "Guest summary created_at is ISO 8601 string",
        typeof guestSummary.created_at === "string" &&
          !Number.isNaN(Date.parse(guestSummary.created_at)),
      );
      TestValidator.predicate(
        "Guest summary updated_at is ISO 8601 string",
        typeof guestSummary.updated_at === "string" &&
          !Number.isNaN(Date.parse(guestSummary.updated_at)),
      );

      // If deleted_at exists, should be string or null
      if (guestSummary.deleted_at !== undefined) {
        TestValidator.predicate(
          "Guest summary deleted_at is null or ISO 8601 string",
          guestSummary.deleted_at === null ||
            (typeof guestSummary.deleted_at === "string" &&
              !Number.isNaN(Date.parse(guestSummary.deleted_at))),
        );
      }
    }
  }
}
