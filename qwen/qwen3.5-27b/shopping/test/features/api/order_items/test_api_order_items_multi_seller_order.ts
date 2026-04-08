import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test multi-seller order items with different fulfillment statuses.
 *
 * Validates that a customer can view order items from multiple sellers within a single order, with each item showing correct seller information and independent fulfillment status. Tests the complete multi-seller order workflow including product creation by two different sellers, customer checkout, partial shipment by one seller, and order items retrieval with status filtering.
 *
 * Special attention is given to verifying that items from different sellers can have different fulfillment stages (shipped vs paid) within the same order, and that the order status correctly reflects the mixed state as 'partially_completed'.
 *
 * 1. Register and authenticate seller A, create product with variant and inventory.
 * 2. Register and authenticate seller B (different account), create different product with variant and inventory.
 * 3. Register and authenticate customer.
 * 4. Customer creates shipping address.
 * 5. Customer adds items from both sellers to cart.
 * 6. Customer places order through checkout.
 * 7. Seller A ships their items (status: shipped).
 * 8. Customer retrieves order items without filter and verifies all items present.
 * 9. Verify seller A's items show status 'shipped' and seller B's items show status 'paid'.
 * 10. Verify order status is 'partially_completed'.
 * 11. Test status filtering to see only shipped items.
 * 12. Test status filtering to see only paid items.
 */
export async function test_api_order_items_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: "1234",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Seller A creates product
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: "Seller A Product",
        description: "Product from seller A",
        base_price: 10000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);
  // 3. Seller A creates variant
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: "SELLER-A-VARIANT-001",
          variantOptions: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  // 4. Register and authenticate seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: "1234",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 5. Seller B creates product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: "Seller B Product",
        description: "Product from seller B",
        base_price: 15000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productB);
  // 6. Seller B creates variant
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: "SELLER-B-VARIANT-001",
          variantOptions: [
            { key: "color", value: "blue" },
            { key: "size", value: "medium" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  // 7. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "1234",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 8. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: "Test Customer",
        phone_number: "01012345678",
        street_address: "123 Test Street",
        city: "Seoul",
        postal_code: "12345",
        country: "South Korea",
      } satisfies IShoppingMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // 9. Customer adds seller A's item to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantA.id,
        quantity: 2,
      } satisfies IShoppingMallCustomerCartItem.ICreate,
    },
  );
  // 10. Customer adds seller B's item to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantB.id,
        quantity: 1,
      } satisfies IShoppingMallCustomerCartItem.ICreate,
    },
  );
  // 11. Customer places order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token_12345",
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 12. Find order items from seller A and seller B
  const sellerAOrderItems = order.items.filter(
    (item) => item.seller.email === sellerAEmail,
  );
  const sellerBOrderItems = order.items.filter(
    (item) => item.seller.email === sellerBEmail,
  );
  // 13. Seller A ships their items
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        carrier_name: "Test Carrier A",
        tracking_number: "TRACK-A-001",
        order_item_ids: sellerAOrderItems.map((item) => item.id),
        order_id: order.id,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipmentA);
  // 14. Customer retrieves all order items without filter
  const allItemsResponse =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(allItemsResponse);
  // 15. Verify all items are present
  TestValidator.equals(
    "all order items present",
    allItemsResponse.data.length,
    order.items.length,
  );
  // 16. Verify seller A's items show status 'shipped'
  TestValidator.equals(
    "seller A items count",
    allItemsResponse.data.filter((item) => item.seller.email === sellerAEmail)
      .length,
    sellerAOrderItems.length,
  );
  TestValidator.predicate(
    "seller A items are shipped",
    allItemsResponse.data
      .filter((item) => item.seller.email === sellerAEmail)
      .every((item) => item.status === "shipped"),
  );
  // 17. Verify seller B's items show status 'paid'
  TestValidator.equals(
    "seller B items count",
    allItemsResponse.data.filter((item) => item.seller.email === sellerBEmail)
      .length,
    sellerBOrderItems.length,
  );
  TestValidator.predicate(
    "seller B items are paid",
    allItemsResponse.data
      .filter((item) => item.seller.email === sellerBEmail)
      .every((item) => item.status === "paid"),
  );
  // 18. Verify seller information is correct
  TestValidator.predicate(
    "seller A shop name visible",
    allItemsResponse.data
      .filter((item) => item.seller.email === sellerAEmail)
      .every((item) => item.seller.seller_profile.shop_name !== undefined),
  );
  TestValidator.predicate(
    "seller B shop name visible",
    allItemsResponse.data
      .filter((item) => item.seller.email === sellerBEmail)
      .every((item) => item.seller.seller_profile.shop_name !== undefined),
  );
  // 19. Verify seller A and seller B have different shop names
  const sellerAShopName = allItemsResponse.data.find(
    (item) => item.seller.email === sellerAEmail,
  )?.seller.seller_profile.shop_name;
  const sellerBShopName = allItemsResponse.data.find(
    (item) => item.seller.email === sellerBEmail,
  )?.seller.seller_profile.shop_name;
  TestValidator.notEquals(
    "different sellers have different shop names",
    sellerAShopName,
    sellerBShopName,
  );
  // 20. Test filtering by status 'shipped' - should only show seller A's items
  const shippedItemsResponse =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "shipped",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedItemsResponse);
  TestValidator.equals(
    "shipped filter returns only seller A items",
    shippedItemsResponse.data.length,
    sellerAOrderItems.length,
  );
  TestValidator.predicate(
    "shipped items all from seller A",
    shippedItemsResponse.data.every(
      (item) => item.seller.email === sellerAEmail,
    ),
  );
  // 21. Test filtering by status 'paid' - should only show seller B's items
  const paidItemsResponse =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidItemsResponse);
  TestValidator.equals(
    "paid filter returns only seller B items",
    paidItemsResponse.data.length,
    sellerBOrderItems.length,
  );
  TestValidator.predicate(
    "paid items all from seller B",
    paidItemsResponse.data.every((item) => item.seller.email === sellerBEmail),
  );
  // 22. Verify product variant information is correct for each item
  TestValidator.predicate(
    "seller A items have correct SKU",
    allItemsResponse.data
      .filter((item) => item.seller.email === sellerAEmail)
      .every((item) => item.productVariant.sku_code === variantA.sku_code),
  );
  TestValidator.predicate(
    "seller B items have correct SKU",
    allItemsResponse.data
      .filter((item) => item.seller.email === sellerBEmail)
      .every((item) => item.productVariant.sku_code === variantB.sku_code),
  );
}
