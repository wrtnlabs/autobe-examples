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
 * Test admin shipment filtering by delivery status "pending".
 *
 * Validates that the admin shipment listing endpoint correctly filters shipments
 * by the "pending" delivery status. An administrator authenticates and queries
 * shipments with deliveryStatus set to "pending", then verifies that every
 * returned shipment has delivered_at set to null and deliveryStatus equal to
 * "pending".
 *
 * The test also confirms that the response includes proper pagination metadata
 * and all standard shipment fields. This validates the deliveryStatus filter
 * derivation logic — that "pending" correctly maps to WHERE delivered_at IS NULL
 * in the database query. Shipments past the 14-day auto-confirmation window but
 * not yet processed by the background job are still returned as "pending",
 * reflecting actual database state rather than expected state.
 *
 * 1. Administrator authenticates via join and obtains admin-scoped connection.
 * 2. Administrator queries shipments with deliveryStatus filter set to "pending".
 * 3. Validates response pagination metadata is present and properly structured.
 * 4. Validates every returned shipment has delivered_at === null.
 * 5. Validates every returned shipment has deliveryStatus equal to "pending".
 */
export async function test_api_admin_shipments_filter_by_delivery_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query shipments filtered by delivery status "pending"
  const page = await api.functional.shoppingMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        deliveryStatus: "pending",
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is not negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is not negative",
    page.pagination.pages >= 0,
  );
  // 4. Validate every shipment has pending delivery status
  for (const shipment of page.data) {
    TestValidator.equals(
      "shipment delivered_at should be null for pending filter",
      shipment.delivered_at,
      null,
    );
    TestValidator.equals(
      "shipment deliveryStatus should be pending",
      shipment.deliveryStatus,
      "pending",
    );
  }
}
