import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Verify that admin shipment search requires proper administrator
 * authentication.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new admin account using POST /auth/admin/join. The SDK
 *    automatically stores the issued access token into the provided
 *    connection's Authorization header.
 * 2. While authenticated as this admin, create at least one shipment via POST
 *    /shoppingMall/admin/shipments so that the search endpoint has meaningful
 *    data to return.
 * 3. Build a deterministic IShoppingMallShipment.IRequest payload specifying
 *    pagination and sorting (page=1, limit=5, sort_by="created_at",
 *    sort_direction="desc").
 * 4. Clone the connection into a new unauthenticated connection by overriding
 *    headers with an empty object literal. Using this unauthenticated
 *    connection, attempt to call PATCH /shoppingMall/admin/shipments and assert
 *    with TestValidator.error that the call fails due to missing
 *    authentication, without inspecting specific HTTP status codes.
 * 5. Using the original, authenticated admin connection, call the same shipment
 *    search endpoint with the identical request body and assert that it
 *    succeeds and returns a paginated result set.
 * 6. Validate basic business invariants on the successful response: current page
 *    and limit match the request, total records are at least as many as the
 *    number of returned rows, and at least one shipment is present (since the
 *    test seeded a shipment in step 2).
 *
 * This test ensures that shipment-level operational data is only accessible to
 * authenticated admin actors, while unauthenticated callers are rejected.
 */
export async function test_api_admin_shipment_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Seed: create and authenticate an admin
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Seed: create at least one shipment using authenticated admin
  const shipmentCreateBody = typia.random<IShoppingMallShipment.ICreate>();
  const createdShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: shipmentCreateBody,
    });
  typia.assert(createdShipment);

  // 3. Prepare a deterministic search request body
  const randomRequest = typia.random<IShoppingMallShipment.IRequest>();
  const searchRequestBody = {
    ...randomRequest,
    page: 1,
    limit: 5,
    sort_by: "created_at",
    sort_direction: "desc" as const,
  } satisfies IShoppingMallShipment.IRequest;

  // 4. Unauthenticated connection clone (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt search without auth and expect failure
  await TestValidator.error(
    "unauthenticated admin shipment search must fail",
    async () => {
      await api.functional.shoppingMall.admin.shipments.index(
        unauthenticatedConnection,
        { body: searchRequestBody },
      );
    },
  );

  // 6. Authenticated search must succeed with the admin connection
  const pageResult = await api.functional.shoppingMall.admin.shipments.index(
    connection,
    { body: searchRequestBody },
  );
  typia.assert(pageResult);

  // 7. Business-level validations on pagination and data
  TestValidator.equals(
    "pagination.current must equal requested page",
    pageResult.pagination.current,
    searchRequestBody.page,
  );
  TestValidator.equals(
    "pagination.limit must equal requested limit",
    pageResult.pagination.limit,
    searchRequestBody.limit,
  );
  TestValidator.predicate(
    "pagination.records must be >= returned data length",
    pageResult.pagination.records >= pageResult.data.length,
  );
  TestValidator.predicate(
    "at least one shipment should be returned when seeded",
    pageResult.data.length >= 1,
  );
}
