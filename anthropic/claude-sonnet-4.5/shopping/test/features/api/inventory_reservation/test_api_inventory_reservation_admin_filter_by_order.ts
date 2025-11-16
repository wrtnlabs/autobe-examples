import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryReservation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test that administrators can filter inventory reservations by order ID
 * parameter.
 *
 * Validates the shopping_mall_order_id filter parameter functionality by
 * querying reservations with different order ID values and validating response
 * structure. Tests filtering mechanics including null values and status
 * combinations.
 *
 * Workflow:
 *
 * 1. Authenticate as admin
 * 2. Test filtering with specific order ID
 * 3. Test filtering for unconverted reservations (null order ID)
 * 4. Test combined filters (status + order relationship)
 * 5. Validate pagination and response structure
 */
export async function test_api_inventory_reservation_admin_filter_by_order(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test filtering by specific order ID
  const targetOrderId = typia.random<string & tags.Format<"uuid">>();
  const filteredByOrder: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          shopping_mall_order_id: targetOrderId,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(filteredByOrder);

  // Step 3: Validate pagination structure
  TestValidator.equals(
    "current page should be 1",
    filteredByOrder.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should not exceed 10",
    filteredByOrder.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    filteredByOrder.data.length <= filteredByOrder.pagination.limit,
  );

  // Step 4: Validate that all returned reservations match the order ID filter (if any results)
  for (const reservation of filteredByOrder.data) {
    typia.assert(reservation);
    if (
      reservation.shopping_mall_order_id !== null &&
      reservation.shopping_mall_order_id !== undefined
    ) {
      TestValidator.equals(
        "reservation order ID should match filter",
        reservation.shopping_mall_order_id,
        targetOrderId,
      );
    }
  }

  // Step 5: Test filtering for unconverted reservations (null order ID)
  const unconvertedReservations: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          shopping_mall_order_id: null,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(unconvertedReservations);

  // Step 6: Validate unconverted reservations have null or undefined order_id
  for (const reservation of unconvertedReservations.data) {
    typia.assert(reservation);
    TestValidator.predicate(
      "unconverted reservation should have null/undefined order ID",
      reservation.shopping_mall_order_id === null ||
        reservation.shopping_mall_order_id === undefined,
    );
  }

  // Step 7: Test combined filtering - converted status reservations
  const convertedReservations: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          reservation_status: "converted",
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(convertedReservations);

  // Step 8: Validate converted reservations have correct status
  for (const reservation of convertedReservations.data) {
    typia.assert(reservation);
    TestValidator.equals(
      "reservation status should be converted",
      reservation.reservation_status,
      "converted",
    );
  }

  // Step 9: Test filtering active reservations
  const activeReservations: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          reservation_status: "active",
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(activeReservations);

  // Step 10: Validate active reservations have correct status
  for (const reservation of activeReservations.data) {
    typia.assert(reservation);
    TestValidator.equals(
      "reservation status should be active",
      reservation.reservation_status,
      "active",
    );
  }

  // Step 11: Test pagination with different page numbers
  const secondPage: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "current page should be 2",
    secondPage.pagination.current,
    2,
  );
}
