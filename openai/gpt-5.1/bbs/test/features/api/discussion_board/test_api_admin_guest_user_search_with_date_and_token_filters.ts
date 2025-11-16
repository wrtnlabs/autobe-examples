import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestuser";

export async function test_api_admin_guest_user_search_with_date_and_token_filters(
  connection: api.IConnection,
) {
  /**
   * 1. Register and authenticate an adminUser via POST /auth/adminUser/join
   *
   *    - Use realistic random email, password, display_name, href, referrer.
   *    - The SDK will set connection.headers.Authorization with the issued access
   *         token, so subsequent calls run as this adminUser.
   */
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  /**
   * 2. Perform an initial guest user search as admin without anonymous_token
   *    filter, but with a broad date range and explicit pagination.
   */
  const broadFrom = "2000-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const broadTo = "2100-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;

  const initialRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at" as const,
    order_direction: "asc" as const,
    created_from: broadFrom,
    created_to: broadTo,
    updated_from: null,
    updated_to: null,
    deleted_from: null,
    deleted_to: null,
    anonymous_token: null,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const initialPage: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: initialRequestBody,
      },
    );
  typia.assert(initialPage);

  const initialPagination: IPage.IPagination = initialPage.pagination;
  typia.assert(initialPagination);

  // Validate basic pagination coherence for the initial search.
  TestValidator.predicate(
    "initial pagination current page is non-negative",
    initialPagination.current >= 0,
  );
  TestValidator.predicate(
    "initial pagination limit is non-negative",
    initialPagination.limit >= 0,
  );
  TestValidator.predicate(
    "initial pagination records is non-negative",
    initialPagination.records >= 0,
  );
  TestValidator.predicate(
    "initial pagination pages is non-negative",
    initialPagination.pages >= 0,
  );

  // If there are no guest users, we cannot test token-based filtering; just
  // ensure that the data array is empty and pagination matches this fact.
  if (initialPage.data.length === 0) {
    TestValidator.equals(
      "when no guest users, records should be 0",
      initialPagination.records,
      0,
    );
    TestValidator.equals(
      "when no guest users, pages should be 0",
      initialPagination.pages,
      0,
    );
    TestValidator.equals(
      "when no guest users, data length should be 0",
      initialPage.data.length,
      0,
    );
    return;
  }

  // Basic relation between records, pages, and limit when there is at least
  // one record. We avoid strict equality because backend may clamp pages.
  TestValidator.predicate(
    "records greater than 0 when data is non-empty",
    initialPagination.records > 0,
  );
  TestValidator.predicate(
    "pages greater than 0 when data is non-empty",
    initialPagination.pages > 0,
  );

  /**
   * 3. Derive an anonymous_token and narrow created_at range from a sample guest
   *    summary to construct a precise filtered search.
   */
  const sampleGuest: IDiscussionBoardGuestUser.ISummary = initialPage.data[0];
  typia.assert(sampleGuest);

  const tokenToFilter: string = sampleGuest.anonymous_token;
  const createdAtSample: string & tags.Format<"date-time"> =
    sampleGuest.created_at;

  const filteredRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at" as const,
    order_direction: "asc" as const,
    created_from: createdAtSample,
    created_to: createdAtSample,
    updated_from: null,
    updated_to: null,
    deleted_from: null,
    deleted_to: null,
    anonymous_token: tokenToFilter,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const filteredPage: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: filteredRequestBody,
      },
    );
  typia.assert(filteredPage);

  const filteredPagination: IPage.IPagination = filteredPage.pagination;
  typia.assert(filteredPagination);

  // Validate filtered pagination coherence.
  TestValidator.predicate(
    "filtered pagination current page is non-negative",
    filteredPagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered pagination limit is non-negative",
    filteredPagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered pagination records is non-negative",
    filteredPagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages is non-negative",
    filteredPagination.pages >= 0,
  );

  // For every returned guest summary, assert that:
  // - anonymous_token equals the filter token
  // - created_at is within [created_from, created_to]
  for (const guest of filteredPage.data) {
    typia.assert(guest);

    TestValidator.equals(
      "guest anonymous_token matches filter",
      guest.anonymous_token,
      tokenToFilter,
    );

    const createdAtValue: string & tags.Format<"date-time"> = guest.created_at;

    TestValidator.predicate(
      "guest created_at is >= created_from",
      createdAtValue >= filteredRequestBody.created_from!,
    );
    TestValidator.predicate(
      "guest created_at is <= created_to",
      createdAtValue <= filteredRequestBody.created_to!,
    );
  }

  /**
   * 4. Verify that only adminUser can perform guest user search by attempting the
   *    same search with an unauthenticated connection, expecting an error.
   */
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guest user search should require admin auth",
    async () => {
      await api.functional.discussionBoard.adminUser.guestUsers.index(
        unauthConnection,
        {
          body: filteredRequestBody,
        },
      );
    },
  );
}
