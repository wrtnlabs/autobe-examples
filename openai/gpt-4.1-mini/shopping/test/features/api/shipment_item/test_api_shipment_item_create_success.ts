import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipment_items_create } from "../../../generate/generate_random_shopping_mall_seller_shipment_items_create";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_shipment_item_create_success(
  connection: api.IConnection,
): Promise<void> {
  // This test covers the successful creation of a shipment item that connects an existing shipment with an existing order item.
  // Steps:
  // 1. Register and authenticate a new seller
  // 2. Create a shipment item by linking a valid shipment and order item owned by this seller
  // 3. Assert the response structure and data integrity
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      shopName: typia.random<string>(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // Update sellerConnection with Authorization header
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Create shipment item using utility function
  //    This utility internally uses sellerConnection and valid shipment and order items belonging to the authenticated seller
  const shipmentItem =
    await generate_random_shopping_mall_seller_shipment_items_create(
      sellerConnection,
      {},
    );
  typia.assert(shipmentItem);
  // 3. Validate response fields
  TestValidator.equals(
    "shipmentId matches",
    shipmentItem.shipmentId,
    shipmentItem.shipment.id,
  );
  TestValidator.equals(
    "orderItemId matches",
    shipmentItem.orderItemId,
    shipmentItem.orderItem.id,
  );
  // Validate timestamps exist and are ISO date strings
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.+/i.test(
      shipmentItem.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.+/i.test(
      shipmentItem.updatedAt,
    ),
  );
  // Soft delete timestamp should be null as this is a newly created item
  TestValidator.equals("deletedAt is null", shipmentItem.deletedAt, null);
  // Authorization enforcement test (should reject unauthorized access)
  {
    const fakeConnection: api.IConnection = { host: connection.host };
    // Use no authorization header
    await TestValidator.error("unauthorized access is rejected", async () => {
      await generate_random_shopping_mall_seller_shipment_items_create(
        fakeConnection,
        {},
      );
    });
  }
}
