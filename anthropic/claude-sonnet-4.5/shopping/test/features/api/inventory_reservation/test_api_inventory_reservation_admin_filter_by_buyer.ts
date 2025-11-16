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
 * Test that administrators can filter inventory reservations by specific buyer
 * ID.
 *
 * This test validates the buyer_id filter parameter functionality in the
 * inventory reservation search API. Since we don't have endpoints to create
 * test buyers or reservations, this test focuses on validating the filter
 * parameter behavior:
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access reservation filtering API
 * 2. Query all reservations without filter to get existing data
 * 3. If reservations exist, select a buyer_id from the results
 * 4. Query reservations filtered by that specific buyer ID
 * 5. Validate that all returned records match the filter criteria
 * 6. Verify pagination metadata is consistent
 * 7. Test with a random UUID to verify empty results for non-existent buyers
 */
export async function test_api_inventory_reservation_admin_filter_by_buyer(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to access reservation filtering
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
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

  // Step 2: Query all reservations to get existing data
  const allReservations: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(allReservations);

  // Step 3: Validate basic pagination structure
  TestValidator.predicate(
    "unfiltered pagination should be valid",
    allReservations.pagination.current >= 1 &&
      allReservations.pagination.limit >= 1 &&
      allReservations.pagination.records >= 0 &&
      allReservations.pagination.pages >= 0,
  );

  // Step 4: If reservations exist, test filtering by an actual buyer_id
  if (allReservations.data.length > 0) {
    const sampleReservation: IShoppingMallInventoryReservation =
      RandomGenerator.pick(allReservations.data);
    const targetBuyerId: string & tags.Format<"uuid"> =
      sampleReservation.shopping_mall_buyer_id;

    // Step 5: Query reservations filtered by the specific buyer ID
    const filteredResult: IPageIShoppingMallInventoryReservation =
      await api.functional.shoppingMall.admin.inventoryReservations.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            shopping_mall_buyer_id: targetBuyerId,
          } satisfies IShoppingMallInventoryReservation.IRequest,
        },
      );
    typia.assert(filteredResult);

    // Step 6: Validate filtered pagination metadata
    TestValidator.predicate(
      "filtered pagination should be valid",
      filteredResult.pagination.current >= 1 &&
        filteredResult.pagination.limit >= 1 &&
        filteredResult.pagination.records >= 0 &&
        filteredResult.pagination.pages >= 0,
    );

    // Step 7: Verify filtered results are not more than total results
    TestValidator.predicate(
      "filtered results should not exceed total results",
      filteredResult.pagination.records <= allReservations.pagination.records,
    );

    // Step 8: Validate that ALL returned reservations belong to the target buyer
    TestValidator.predicate(
      "at least one reservation should be returned for existing buyer",
      filteredResult.data.length > 0,
    );

    filteredResult.data.forEach(
      (reservation: IShoppingMallInventoryReservation, index: number) => {
        TestValidator.equals(
          `reservation ${index} should belong to target buyer`,
          reservation.shopping_mall_buyer_id,
          targetBuyerId,
        );
      },
    );
  }

  // Step 9: Test filtering by non-existent buyer ID (should return empty results)
  const nonExistentBuyerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyResult: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          shopping_mall_buyer_id: nonExistentBuyerId,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(emptyResult);

  // Step 10: Validate that filtering by non-existent buyer returns zero results
  TestValidator.equals(
    "non-existent buyer should return zero reservations",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent buyer should have zero total records",
    emptyResult.pagination.records,
    0,
  );
}
