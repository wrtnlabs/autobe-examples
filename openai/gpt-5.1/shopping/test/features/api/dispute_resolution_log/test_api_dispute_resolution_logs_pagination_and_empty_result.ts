import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDisputeResolutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeResolutionLog";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDisputeResolutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeResolutionLog";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate pagination and empty result behavior of dispute resolution log
 * search.
 *
 * Business goal
 *
 * - Ensure that platform admin dispute resolution log search correctly handles a
 *   query that matches zero records, while still returning a well-formed
 *   paginated response.
 * - Confirm that pagination metadata is consistent with the empty data set and
 *   reflects the requested pagination values.
 *
 * High-level flow
 *
 * 1. Bootstrap a platform admin account and session using POST
 *    /auth/platformAdmin/join.
 *
 *    - Use realistic random values for email, name, password, and session context
 *         (href, referrer) following IShoppingMallPlatformAdminJoin.IRequest.
 *    - Rely on the SDK to attach the access token to the connection.
 * 2. Call PATCH /shoppingMall/platformAdmin/disputeResolutionLogs through
 *    api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.index with
 *    an IShoppingMallDisputeResolutionLog.IRequest payload that is very
 *    unlikely to match any existing rows.
 *
 *    - Set disputeId to a freshly generated UUID, independent of any created
 *         disputes.
 *    - Explicitly set page and limit to concrete positive values (for example, page
 *         = 1, limit = 10) allowed by the DTO.
 *    - Optionally choose an orderBy and orderDirection combination that is valid
 *         (e.g., created_at + desc) to exercise sorting handling, even though
 *         no data will be returned.
 * 3. Assert that the API responds with an
 *    IPageIShoppingMallDisputeResolutionLog.ISummary structure (the HTTP status
 *    is abstracted by the SDK).
 *
 *    - Use typia.assert to validate the full response type.
 * 4. Validate pagination metadata for the empty result set.
 *
 *    - Pagination.records must be 0.
 *    - Pagination.pages must be 0.
 *    - Pagination.current must be 0, per IPage.IPagination docs for empty sets.
 *    - Pagination.limit should equal the effective limit that the backend applied;
 *         when the request body sets a limit (e.g., 10), expect this same value
 *         in the response, assuming no server-side capping is described.
 * 5. Validate the data array behavior.
 *
 *    - Data should be an empty array.
 *    - Its length must be 0, and there should be no iteration over elements.
 * 6. Sanity checks around consistency.
 *
 *    - When records is 0 and pages is 0, current must be 0 as specified in
 *         IPage.IPagination docs.
 *    - Ensure that the test does not rely on any pre-existing disputes or logs, so
 *         it remains deterministic in an isolated environment.
 */
export async function test_api_dispute_resolution_logs_pagination_and_empty_result(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish an authenticated session.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a request that should match no dispute resolution logs.
  const requestBody = {
    disputeId: typia.random<string & tags.Format<"uuid">>(),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallDisputeResolutionLog.IRequest;

  const pageResult: IPageIShoppingMallDisputeResolutionLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 4. Validate pagination metadata for an empty result set.
  TestValidator.equals(
    "dispute logs search: records must be zero when no logs match",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "dispute logs search: pages must be zero when no logs match",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "dispute logs search: current page index must be zero when there are no records",
    pagination.current,
    0,
  );

  TestValidator.equals(
    "dispute logs search: limit should reflect requested page size",
    pagination.limit,
    requestBody.limit,
  );

  // 5. Validate data array is empty.
  TestValidator.equals(
    "dispute logs search: data array must be empty when no logs match",
    data.length,
    0,
  );

  TestValidator.equals(
    "dispute logs search: data array should equal empty array",
    data,
    [],
  );
}
