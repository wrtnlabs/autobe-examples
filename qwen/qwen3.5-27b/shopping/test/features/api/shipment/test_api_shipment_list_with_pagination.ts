import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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
 * Test seller shipment listing with pagination functionality.
 *
 * This test verifies that sellers can retrieve their shipments with proper
 * pagination, filtering, and data structure. It validates seller isolation,
 * pagination metadata accuracy, and shipment data completeness.
 */
export async function test_api_shipment_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(sellerAuth);
  // 2. Test first page retrieval with default pagination
  const firstPage = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {} satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    firstPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    firstPage.pagination.pages >= 0,
  );
  // 4. Validate each shipment in the first page
  await ArrayUtil.asyncForEach(firstPage.data, async (shipment, index) => {
    typia.assert(shipment);
    // Verify seller isolation - all shipments belong to authenticated seller
    TestValidator.equals(
      `shipment ${index} belongs to authenticated seller`,
      shipment.seller.id,
      sellerAuth.id,
    );
    // Verify required shipment fields exist
    TestValidator.predicate(
      `shipment ${index} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shipment.id,
      ),
    );
    TestValidator.predicate(
      `shipment ${index} has tracking carrier`,
      shipment.tracking_carrier.length > 0,
    );
    TestValidator.predicate(
      `shipment ${index} has tracking number`,
      shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      `shipment ${index} has shipped_at timestamp`,
      shipment.shipped_at.length > 0,
    );
    TestValidator.predicate(
      `shipment ${index} has non-negative item count`,
      shipment.item_count >= 0,
    );
    TestValidator.predicate(
      `shipment ${index} has created_at timestamp`,
      shipment.created_at.length > 0,
    );
    // Verify seller information in shipment
    typia.assert(shipment.seller);
    TestValidator.equals(
      `shipment ${index} seller email matches`,
      shipment.seller.email,
      sellerAuth.email,
    );
  });
  // 5. Test pagination with explicit page and limit parameters
  const secondPage = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(secondPage);
  // 6. Validate second page pagination metadata
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 10",
    secondPage.pagination.limit,
    10,
  );
  // 7. Verify data consistency across pages
  TestValidator.equals(
    "total records consistent across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent across pages",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  // 8. Verify page data size respects limit
  TestValidator.predicate(
    "second page data size respects limit",
    secondPage.data.length <= 10,
  );
  // 9. Test filtering by status (pending shipments)
  const pendingShipments =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(pendingShipments);
  // 10. Validate all returned shipments have pending status
  await ArrayUtil.asyncForEach(pendingShipments.data, async (shipment) => {
    typia.assert(shipment);
    // Pending shipments should have delivered_at as null
    TestValidator.equals(
      "pending shipment has null delivered_at",
      shipment.delivered_at,
      null,
    );
    // Verify seller isolation for filtered results
    TestValidator.equals(
      "filtered shipment belongs to authenticated seller",
      shipment.seller.id,
      sellerAuth.id,
    );
  });
  // 11. Test filtering by tracking carrier
  const carrier = RandomGenerator.name();
  const carrierShipments =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        tracking_carrier: carrier,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(carrierShipments);
  // 12. Validate pagination metadata for filtered results
  TestValidator.predicate(
    "carrier filter returns valid pagination",
    carrierShipments.pagination.current >= 1,
  );
  TestValidator.predicate(
    "carrier filter has non-negative records",
    carrierShipments.pagination.records >= 0,
  );
}
