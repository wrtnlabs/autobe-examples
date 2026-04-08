import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller shipment listing with delivery status filter.
 *
 * Validates that sellers can retrieve their shipments filtered by delivery status (delivered vs in-transit). Tests the filtering logic, response structure, and pagination metadata.
 *
 * The test verifies three scenarios: filtering for delivered shipments only (is_delivered=true), filtering for in-transit shipments only (is_delivered=false), and retrieving all shipments without status filter. Each scenario validates that the response structure is correct and the filtering logic works as expected.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Query shipments with is_delivered=true filter and validate all have delivered_at set.
 * 3. Query shipments with is_delivered=false filter and validate all have delivered_at null.
 * 4. Query shipments without filter and validate response structure and pagination.
 * 5. Verify pagination metadata accuracy across all queries.
 */
export async function test_api_seller_shipment_listing_with_delivery_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Query shipments with is_delivered=true filter (delivered shipments)
  const deliveredShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          is_delivered: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredShipments);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    deliveredShipments.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(deliveredShipments.data),
  );
  TestValidator.predicate(
    "current page is 1",
    deliveredShipments.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    deliveredShipments.pagination.limit === 20,
  );
  // Validate all returned shipments have delivered_at set
  for (const shipment of deliveredShipments.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} has delivered_at`,
      shipment.delivered_at !== null,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has valid shipped_at`,
      shipment.shipped_at !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has carrier_name`,
      shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has tracking_number`,
      shipment.tracking_number.length > 0,
    );
  }
  // 3. Query shipments with is_delivered=false filter (in-transit shipments)
  const inTransitShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          is_delivered: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(inTransitShipments);
  // Validate all returned shipments have delivered_at as null
  for (const shipment of inTransitShipments.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} has null delivered_at`,
      shipment.delivered_at === null,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has valid shipped_at`,
      shipment.shipped_at !== undefined,
    );
  }
  // 4. Query shipments without delivery status filter (all shipments)
  const allShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  // Validate response structure
  TestValidator.predicate(
    "all shipments pagination exists",
    allShipments.pagination !== undefined,
  );
  TestValidator.predicate(
    "all shipments data array exists",
    Array.isArray(allShipments.data),
  );
  // Validate each shipment has required fields
  for (const shipment of allShipments.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} has id`,
      shipment.id !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has order`,
      shipment.order !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has seller`,
      shipment.seller !== undefined,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has order_items_count`,
      shipment.order_items_count >= 0,
    );
  }
  // 5. Validate pagination metadata consistency
  TestValidator.predicate(
    "pages calculation is correct",
    allShipments.pagination.pages ===
      Math.ceil(
        allShipments.pagination.records / allShipments.pagination.limit,
      ),
  );
  // Verify delivered + in-transit counts don't exceed total (they may overlap if data changes between queries)
  TestValidator.predicate(
    "delivered count doesn't exceed total",
    deliveredShipments.pagination.records <= allShipments.pagination.records,
  );
  TestValidator.predicate(
    "in-transit count doesn't exceed total",
    inTransitShipments.pagination.records <= allShipments.pagination.records,
  );
}
