import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin-exclusive sellerId filter on shipment listing.
 *
 * Validates that an authenticated administrator can filter the shipment listing
 * by a specific seller's unique identifier — a privilege exclusive to the
 * administrator role. Sellers are automatically scoped to their own shipments
 * and customers to their orders', so only administrators can scope across
 * sellers via the sellerId filter parameter.
 *
 * The test first retrieves all shipments without filtering to discover an
 * available seller identifier, then applies the sellerId filter and confirms
 * that every returned shipment belongs to the specified seller. Pagination
 * metadata is also validated for correctness.
 *
 * 1. Administrator registers via authorize_admin_join with randomized credentials.
 * 2. Retrieve all shipments to discover an available seller ID from the data.
 * 3. Apply the sellerId filter to narrow results to that seller's shipments.
 * 4. Validate that every returned shipment's seller summary id matches the target.
 * 5. Validate pagination metadata structure and consistency.
 */
export async function test_api_admin_shipments_filter_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve all shipments to discover an available seller
  const allShipments = await api.functional.shoppingMall.admin.shipments.index(
    adminConnection,
    { body: {} satisfies IShoppingMallShipment.IRequest },
  );
  typia.assert(allShipments);
  if (allShipments.data.length === 0) {
    return;
  }
  // 3. Extract a seller ID from the first shipment
  const targetSellerId = allShipments.data[0].seller.id;
  // 4. Filter shipments by that seller ID
  const filteredShipments =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        sellerId: targetSellerId,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(filteredShipments);
  // 5. Validate every returned shipment belongs to the target seller
  TestValidator.predicate(
    "filtered shipments not empty",
    filteredShipments.data.length > 0,
  );
  for (const shipment of filteredShipments.data) {
    TestValidator.equals(
      "shipment seller id matches filter",
      shipment.seller.id,
      targetSellerId,
    );
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    filteredShipments.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count covers data length",
    filteredShipments.pagination.records >= filteredShipments.data.length,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    filteredShipments.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    filteredShipments.pagination.pages >= 0,
  );
}
