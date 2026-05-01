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
 * Test that requesting shipments for a non-existent order returns 404.
 *
 * Validates that the shipments endpoint correctly distinguishes between a
 * non-existent order and an existing order with no shipments. When an
 * administrator requests shipments for an order ID that does not correspond
 * to any order in the database, the server returns HTTP 404 Not Found.
 *
 * The administrator is properly authenticated via join before making the
 * request. A validly-formatted UUID that does not match any existing order
 * is used to ensure the error is due to the missing order resource and not
 * due to authentication or authorization failures.
 *
 * 1. Administrator registers and obtains authentication tokens.
 * 2. A random UUID is generated as the non-existent order identifier.
 * 3. The shipments endpoint is called with the non-existent order ID.
 * 4. The response is validated to be HTTP 404 Not Found.
 */
export async function test_api_admin_order_shipments_nonexistent_order_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent order returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.index(
        adminConnection,
        {
          orderId: nonExistentOrderId,
          body: {} satisfies IShoppingMallShipment.IRequest,
        },
      );
    },
  );
}
