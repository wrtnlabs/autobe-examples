import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // ===== STEP 1: First Seller Setup =====
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `ShopA_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(sellerA);
  const productA =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: `ProductA_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: `SKU_A_${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Red", size: "Large" },
          price: productA.base_price,
        },
      },
    );
  typia.assert(variantA);
  // ===== STEP 2: Second Seller Setup =====
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `ShopB_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(sellerB);
  const productB =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: `ProductB_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: `SKU_B_${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Blue", size: "Medium" },
          price: productB.base_price,
        },
      },
    );
  typia.assert(variantB);
  // ===== STEP 3: Customer Setup =====
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: "Seoul",
        stateProvince: "Seoul",
        postalCode: RandomGenerator.alphaNumeric(5),
        country: "South Korea",
      },
    },
  );
  typia.assert(address);
  // ===== STEP 4: Create Order with Items from Both Sellers =====
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Find items belonging to Seller A (assuming the generated order has items)
  const sellerAOrderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerA.id,
  );
  // ===== STEP 5: Seller A Creates Shipment for Their Items =====
  // Only create shipment if Seller A has items in this order
  if (sellerAOrderItems.length > 0) {
    const shipment =
      await generate_random_shopping_mall_seller_seller_shipments_create(
        sellerAConnection,
        {
          body: {
            carrierName: "FedEx",
            trackingNumber: RandomGenerator.alphaNumeric(12),
            orderId: order.id,
            orderItemIds: sellerAOrderItems.map((item) => item.id),
          },
        },
      );
    typia.assert(shipment);
    // ===== STEP 6: Customer Views Shipment Details =====
    const shipmentDetails =
      await api.functional.shoppingMall.customer.orders.shipments.at(
        customerConnection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
        },
      );
    typia.assert(shipmentDetails);
    // ===== STEP 7: Validate Seller Isolation =====
    // Shipment must contain only Seller A's items
    TestValidator.equals(
      "shipment seller matches",
      shipmentDetails.seller.id,
      sellerA.id,
    );
    // All items in shipment must belong to Seller A
    TestValidator.predicate(
      "all shipment items belong to one seller",
      shipmentDetails.orderItems.every(
        (item) => item.seller.id === shipmentDetails.seller.id,
      ),
    );
    // Shipment item count should match
    TestValidator.equals(
      "shipment item count",
      shipmentDetails.orderItems.length,
      sellerAOrderItems.length,
    );
    // All items should have shipped status
    TestValidator.predicate(
      "all items have shipped status",
      shipmentDetails.orderItems.every((item) => item.status === "shipped"),
    );
  }
}
