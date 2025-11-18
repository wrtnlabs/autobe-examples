import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogTopSellingSkuStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogTopSellingSkuStatistics";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Verify that the admin-only top-selling SKU statistics endpoint rejects
 * unauthenticated and non-admin callers.
 *
 * Business context: The PATCH
 * /shoppingMall/admin/catalog/statistics/topSellingSkus endpoint exposes
 * platform-wide analytics over order and SKU data, intended only for
 * administrative dashboards. It must not be accessible to the public or to
 * regular customer actors. This test ensures that the access control layer is
 * correctly enforced for two negative cases:
 *
 * 1. No Authorization header (unauthenticated caller)
 * 2. Customer Authorization header (authenticated but non-admin actor)
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection by cloning the incoming connection but
 *    resetting headers to an empty object.
 * 2. With that unauthenticated connection, call
 *    api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index
 *    using a minimal, valid IRequest body (empty object satisfies IRequest).
 *    The call must fail.
 * 3. Register a new customer via api.functional.auth.customer.join, using a fully
 *    populated IShoppingMallCustomerJoin.IRequest body.
 *
 *    - This call will set connection.headers.Authorization to a customer token.
 *    - Assert the response shape with typia.assert.
 * 4. While the connection is now authenticated as a customer, attempt to call the
 *    same admin analytics endpoint again, this time with a slightly richer
 *    IRequest body (e.g., providing a `limit` field).
 *
 *    - The call must fail because a customer should not access admin-only analytics.
 * 5. Both failure expectations must be expressed using TestValidator.error with
 *    proper async/await usage and descriptive titles.
 */
export async function test_api_admin_top_selling_skus_unauthorized_access_rejected(
  connection: api.IConnection,
) {
  // 1. Unauthenticated request: clone connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Minimal valid body: all fields in IRequest are optional, so an empty
  // object satisfies the type.
  const minimalBody =
    {} satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  // Expect an error when calling admin analytics without Authorization
  await TestValidator.error(
    "admin analytics must reject unauthenticated caller",
    async () => {
      await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
        unauthenticatedConnection,
        {
          body: minimalBody,
        },
      );
    },
  );

  // 2. Customer-authenticated request: join as customer to get a customer token
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // Now the original `connection` carries a customer Authorization header.
  // Build a request with a limit to ensure body validation is clearly valid.
  const requestBodyWithLimit = {
    limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  await TestValidator.error(
    "admin analytics must reject customer actor",
    async () => {
      await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
        connection,
        {
          body: requestBodyWithLimit,
        },
      );
    },
  );
}
