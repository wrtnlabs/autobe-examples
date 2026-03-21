import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_order_items_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for status updates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Create seller 1 and create product
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  await authorize_seller_login(seller1Connection, {
    body: {
      email: seller1Auth.email,
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const seller1Product =
    await generate_random_ecommerce_mall_seller_products_create(
      seller1Connection,
      {},
    );
  typia.assert(seller1Product);
  // Add inventory to seller1's product variant
  const variant1 = seller1Product.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller1Connection,
    {
      params: { productId: seller1Product.id, variantId: variant1.id },
      body: { operation: "restock", quantity: 10, reason: "Initial stock" },
    },
  );
  // 3. Create seller 2 and create product
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  await authorize_seller_login(seller2Connection, {
    body: {
      email: seller2Auth.email,
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const seller2Product =
    await generate_random_ecommerce_mall_seller_products_create(
      seller2Connection,
      {},
    );
  typia.assert(seller2Product);
  // Add inventory to seller2's product variant
  const variant2 = seller2Product.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller2Connection,
    {
      params: { productId: seller2Product.id, variantId: variant2.id },
      body: { operation: "restock", quantity: 10, reason: "Initial stock" },
    },
  );
  // 4. Create customer and add items to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Add both products to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { variant_id: variant1.id, quantity: 2 },
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { variant_id: variant2.id, quantity: 1 },
    },
  );
  // 5. Prepare and confirm checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: { payment_token: "mock_payment_token" },
      },
    );
  typia.assert(order);
  // 6. Get order items - all should be in "paid" status initially
  const allItems =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(allItems);
  // Find items by seller using product snapshots
  const item1 = allItems.data.find(
    (item) => item.productSnapshot.seller.id === seller1Auth.id,
  )!;
  const item2 = allItems.data.find(
    (item) => item.productSnapshot.seller.id === seller2Auth.id,
  )!;
  // 7. Admin updates item1 to "delivered" status
  const deliveredItem =
    await api.functional.ecommerceMall.admin.orders.items.update(
      adminConnection,
      {
        orderId: order.id,
        itemId: item1.id,
        body: { status: "force_refunded" },
      },
    );
  typia.assert(deliveredItem);
  // 8. Filter order items by status "paid" - should only return item2
  const paidItems =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: { status: ["paid"] },
      },
    );
  typia.assert(paidItems);
  TestValidator.equals("paid items count", paidItems.data.length, 1);
  TestValidator.equals("paid item is item2", paidItems.data[0].id, item2.id);
  // 9. Filter by product_id - get items for seller1's product
  const product1Items =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: { product_id: seller1Product.id },
      },
    );
  typia.assert(product1Items);
  TestValidator.equals("product filter count", product1Items.data.length, 1);
  TestValidator.equals(
    "product filter returns correct item",
    product1Items.data[0].id,
    item1.id,
  );
  // 10. Filter by seller_id - get items for seller2
  const seller2Items =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: { seller_id: seller2Auth.id },
      },
    );
  typia.assert(seller2Items);
  TestValidator.equals("seller filter count", seller2Items.data.length, 1);
  TestValidator.equals(
    "seller filter returns correct item",
    seller2Items.data[0].id,
    item2.id,
  );
  // 11. Filter by multiple statuses - should return both items (paid and refunded)
  const multiStatusItems =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: { status: ["paid", "refunded"] },
      },
    );
  typia.assert(multiStatusItems);
  TestValidator.equals(
    "multi-status filter count",
    multiStatusItems.data.length,
    2,
  );
}
