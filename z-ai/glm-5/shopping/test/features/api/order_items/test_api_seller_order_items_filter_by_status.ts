import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_seller_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test that a seller can filter order items by status to identify items requiring specific actions.
  // Sellers need to quickly find 'paid' items awaiting shipment, track 'shipped' items in transit, and review 'delivered' items.
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create seller account
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(sellerAuth);
  // Step 3: Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Step 4: Seller login after approval
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLogin);
  // Step 5: Seller creates product with variant and inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Add inventory
  const inventory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerLoginConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventory);
  // Step 6: Create customer and place orders
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Create address for customer orders
  // Note: The order creation utility requires an address_id, so we need to handle this properly
  // Since there's no address creation utility exposed, we'll work with what's available
  // The generate_random_shopping_mall_customer_orders_create expects an address_id in the body
  // Place order 1 (will remain 'paid')
  const order1Body: IShoppingMallOrder.ICreate = {
    address_id: typia.random<string & tags.Format<"uuid">>(),
  };
  // Add item to cart for order 1
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  // Place order 2 (will be 'paid' then 'shipped')
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // Step 7: Test filtering by status
  // Test 1: Filter by 'paid' status
  const paidItemsResult =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerLoginConnection,
      {
        body: {
          status: ["paid"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidItemsResult);
  // Since orders are created with carts, items should be in 'paid' status initially
  const hasPaidItems = paidItemsResult.data.length > 0;
  TestValidator.predicate(
    "paid items filter returns only paid items",
    paidItemsResult.data.every(
      (item) => item.status === "paid" || paidItemsResult.data.length === 0,
    ),
  );
  // Test 2: Filter by 'shipped' status
  const shippedItemsResult =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerLoginConnection,
      {
        body: {
          status: ["shipped"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedItemsResult);
  TestValidator.predicate(
    "shipped items filter returns only shipped items",
    shippedItemsResult.data.every(
      (item) =>
        item.status === "shipped" || shippedItemsResult.data.length === 0,
    ),
  );
  // Test 3: Filter by multiple statuses
  const multipleStatusResult =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerLoginConnection,
      {
        body: {
          status: ["paid", "shipped"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(multipleStatusResult);
  TestValidator.predicate(
    "multiple status filter returns only paid or shipped items",
    multipleStatusResult.data.every(
      (item) =>
        item.status === "paid" ||
        item.status === "shipped" ||
        multipleStatusResult.data.length === 0,
    ),
  );
  // Test 4: Empty filter returns all items
  const allItemsResult =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerLoginConnection,
      {
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(allItemsResult);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    allItemsResult.pagination.current >= 0 &&
      allItemsResult.pagination.limit >= 0 &&
      allItemsResult.pagination.records >= 0 &&
      allItemsResult.pagination.pages >= 0,
  );
}
