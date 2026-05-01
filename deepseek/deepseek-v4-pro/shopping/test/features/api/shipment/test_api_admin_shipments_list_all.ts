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
 * Test administrator's ability to list all shipments across the entire platform.
 *
 * Authenticates as a platform administrator and retrieves the complete shipment
 * listing without applying any filters, confirming the admin's unscoped view
 * returns data from all sellers. The response undergoes complete structural
 * validation via typia.assert, then cross-field pagination coherence is verified
 * (pages equals ceiling of records divided by limit), and sorting order is
 * confirmed as descending by created_at so newer shipments appear first.
 *
 * An empty result set is acceptable — the primary goal is verifying endpoint
 * accessibility for administrators and that the unscoped cross-seller view
 * functions correctly.
 */
export async function test_api_admin_shipments_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve all shipments without filters
  const result = await api.functional.shoppingMall.admin.shipments.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata cross-field coherence
  TestValidator.predicate(
    "pagination pages equals ceil(records / limit)",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate sorting: created_at descending (newest first)
  for (let i = 1; i < result.data.length; i++) {
    const prevTime = new Date(result.data[i - 1].created_at).getTime();
    const currTime = new Date(result.data[i].created_at).getTime();
    TestValidator.predicate(
      `shipments sorted by created_at descending at index ${i}`,
      prevTime >= currTime,
    );
  }
}
