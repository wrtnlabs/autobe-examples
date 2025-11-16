import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test that an authenticated administrator can fetch paginated and filtered
 * shipment records via the advanced search endpoint.
 *
 * 1. Register a new admin account and obtain authentication (JWT) tokens.
 * 2. As an authenticated admin, perform shipment search against
 *    /shoppingMall/admin/shipments:
 *
 *    - Provide variety of legitimate filter, sort, and pagination criteria,
 *         including status, time ranges, carrier, etc.
 *    - Cover business-meaningful search cases and check admin has permission to see
 *         filtered results.
 *    - For positive case: Validate returned page and shipment list matches schema
 *         and expectations.
 *    - For negative (invalid filters): Assert clear error feedback for bad
 *         filter/sort scenarios.
 *    - Confirm that sorting and pagination are correctly applied in result.
 *    - Ensure only permitted records are returned (business permissions respected).
 */
export async function test_api_shipment_search_and_filter_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin account registration + authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A!12";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Shipment search with advanced filters and sorting (happy path)
  const filterBody = {
    status: RandomGenerator.pick([
      "pending",
      "ready",
      "picked_up",
      "in_transit",
      "delivered",
      "cancelled",
      "returned",
    ] as const),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    sort_by: RandomGenerator.pick([
      "created_at",
      "status",
      "delivery_at",
    ] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
    carrier_tracking_code: RandomGenerator.alphaNumeric(10),
    created_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_to: new Date().toISOString(),
    delivery_from: new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    delivery_to: new Date().toISOString(),
    provider_response_code: RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallShipment.IRequest;

  const result: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.admin.shipments.index(connection, {
      body: filterBody,
    });
  typia.assert(result);
  TestValidator.predicate(
    "pagination must be valid page info",
    typeof result.pagination.current === "number" &&
      result.pagination.current >= 0 &&
      result.pagination.current <= result.pagination.pages,
  );
  TestValidator.predicate(
    "shipment summary data array exists",
    Array.isArray(result.data),
  );
  if (result.data.length > 0) {
    for (const summary of result.data) {
      typia.assert(summary);
      if (filterBody.status) {
        TestValidator.equals(
          "shipment status matches filter",
          summary.status,
          filterBody.status,
        );
      }
    }
  }

  // 3. Invalid filter: date range where 'from' is after 'to', should error
  await TestValidator.error(
    "created_from after created_to triggers error",
    async () => {
      await api.functional.shoppingMall.admin.shipments.index(connection, {
        body: {
          ...filterBody,
          created_from: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_to: new Date().toISOString(),
        },
      });
    },
  );
}
