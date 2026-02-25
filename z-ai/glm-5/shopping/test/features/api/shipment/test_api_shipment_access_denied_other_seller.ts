import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_shipment_access_denied_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test authorization enforcement ensuring a seller cannot access
  // shipments created by another seller.
  //
  // Preconditions:
  // - Two separate seller accounts exist (Seller A and Seller B)
  // - Both sellers are approved
  // - Seller A has created a product, variant, and added inventory
  // - A customer has placed an order containing Seller A's variant
  // - Seller A has created a shipment for their order items
  // - Seller B is authenticated but has no relationship to Seller A's shipment
  //
  // Test Steps:
  // 1. Create admin and approve both sellers
  // 2. Seller A creates product with variant and inventory
  // 3. Customer places order
  // 4. Seller A creates shipment
  // 5. Seller B attempts to access Seller A's shipment
  // 6. Verify 403 Forbidden response
  // 1. Create admin connection for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create and approve Seller A (shipment owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerACreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name() + " Shop A",
    href: "https://test.com",
    referrer: "https://test.com",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: sellerACreds,
  });
  typia.assert(sellerA);
  // Approve Seller A
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerA.id,
  });
  // Login Seller A after approval
  const sellerALogin = await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerACreds.email,
      password: sellerACreds.password,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerALogin);
  // 3. Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller A creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          price: 12000,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "M" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 5. Seller A adds inventory
  const inventory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerAConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 50,
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventory);
  // 6. Create customer and place order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Create order (requires address and cart setup)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // 7. Find Seller A's order items from the order
  const sellerAOrderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerA.id,
  );
  TestValidator.predicate(
    "Order contains Seller A items",
    sellerAOrderItems.length > 0,
  );
  // 8. Seller A creates a shipment for their order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerAConnection,
      {
        body: {
          orderItemIds: sellerAOrderItems.map((item) => item.id) as [
            string & tags.Format<"uuid">,
            ...Array<string & tags.Format<"uuid">>,
          ],
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
        },
      },
    );
  typia.assert(shipment);
  // 9. Create and approve Seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name() + " Shop B",
    href: "https://test.com",
    referrer: "https://test.com",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: sellerBCreds,
  });
  typia.assert(sellerB);
  // Approve Seller B
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerB.id,
  });
  // Login Seller B after approval
  const sellerBLogin = await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBCreds.email,
      password: sellerBCreds.password,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerBLogin);
  // 10. Seller B attempts to access Seller A's shipment (should fail with 403)
  await TestValidator.httpError(
    "Seller B cannot access Seller A's shipment",
    403,
    async () => {
      await api.functional.shoppingMall.seller.shipments.at(sellerBConnection, {
        shipmentId: shipment.id,
      });
    },
  );
}
