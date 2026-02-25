import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_customer_shipment_tracking_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url:
        Math.random() > 0.5
          ? null
          : typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://google.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Get seller ID from seller response
  const sellerId = sellerResponse.data.profile.id;
  // 4. Create a mock order ID for testing
  const mockOrderId = typia.random<string & tags.Format<"uuid">>();
  // 5. Create shipment with tracking information
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_id: mockOrderId,
        tracking_number: `TRK-${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
        tracking_carrier: RandomGenerator.pick([
          "FedEx",
          "DHL",
          "Korea Express",
          "Hanjin",
          "CJ Logistics",
        ]),
        items: [{ item_ids: [typia.random<string & tags.Format<"uuid">>()] }],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Customer retrieves shipment tracking information
  const tracking =
    await api.functional.shoppingMall.customer.shipments.tracking.at(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(tracking);
  // 7. Validate tracking information
  TestValidator.equals("shipment ID matches", tracking.id, shipment.id);
  TestValidator.equals(
    "tracking number matches",
    tracking.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "tracking carrier matches",
    tracking.trackingCarrier,
    shipment.trackingCarrier,
  );
  TestValidator.equals(
    "shipped at matches",
    tracking.shippedAt,
    shipment.shippedAt,
  );
  TestValidator.equals("status is shipped", tracking.status, "shipped");
  TestValidator.equals(
    "customer confirmed at is null",
    tracking.customerConfirmedAt,
    null,
  );
  TestValidator.equals(
    "auto confirmed at is null",
    tracking.autoConfirmedAt,
    null,
  );
  TestValidator.equals("cancelled at is null", tracking.cancelledAt, null);
  // 8. Validate related data exists
  typia.assert(tracking.order);
  typia.assert(tracking.seller);
  TestValidator.equals("order ID matches", tracking.order.id, mockOrderId);
  TestValidator.equals("seller ID matches", tracking.seller.id, sellerId);
}
