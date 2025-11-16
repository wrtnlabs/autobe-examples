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
 * Ensure dispute resolution logs search endpoint enforces platform-admin-only
 * access.
 *
 * Business goal
 *
 * - Verify that only authenticated platform administrators can search dispute
 *   resolution logs via PATCH
 *   /shoppingMall/platformAdmin/disputeResolutionLogs.
 * - Unauthenticated callers must receive an error (authorization failure), while
 *   authenticated platform admins must succeed and receive a valid paginated
 *   response.
 *
 * High-level steps
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join to obtain an
 *    authorized admin session bound to the `connection`.
 * 2. Build a minimal but valid IShoppingMallDisputeResolutionLog.IRequest body
 *    with generic pagination parameters (page=1, limit=10).
 * 3. Create an unauthenticated-style connection object by shallow copying the
 *    original connection but not mutating its headers after creation.
 * 4. Call the disputeResolutionLogs.index endpoint with the unauthenticated
 *    connection and assert that it throws an error using TestValidator.error.
 *    We do not assert a specific HTTP status code; we only require that an
 *    error occurs for unauthenticated access.
 * 5. Call the same endpoint with the authenticated admin connection and assert
 *    that a valid IPageIShoppingMallDisputeResolutionLog.ISummary response is
 *    returned using typia.assert, then perform a couple of basic logical checks
 *    on the pagination metadata.
 */
export async function test_api_dispute_resolution_logs_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin; SDK manages Authorization.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: "platform-admin",
    password: "Str0ngP@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });

  // 2. Prepare a minimal, valid dispute resolution log search request.
  const searchBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallDisputeResolutionLog.IRequest;

  // 3. Build an unauthenticated-style connection object without touching headers after creation.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Unauthenticated access must fail with some error.
  await TestValidator.error("unauthenticated access must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.index(
      unauthenticatedConnection,
      {
        body: searchBody,
      },
    );
  });

  // 5. Authenticated platform admin access must succeed and return a valid page.
  const pageResult: IPageIShoppingMallDisputeResolutionLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert<IPageIShoppingMallDisputeResolutionLog.ISummary>(pageResult);

  TestValidator.predicate(
    "pagination current page must be >= 0",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    pageResult.pagination.limit >= 0,
  );
}
