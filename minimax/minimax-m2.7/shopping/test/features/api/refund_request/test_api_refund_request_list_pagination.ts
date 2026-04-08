import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test pagination functionality when listing refund requests for a seller.
 *
 * Validates the complete workflow of creating refund requests from multiple customers
 * and verifying pagination behavior when listing them. The test creates a seller with
 * approved status, registers multiple customers, creates products with inventory,
 * and simulates the full order-to-refund flow. Then verifies that the paginated
 * refund request listing returns correct page boundaries and metadata.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers and is approved by admin.
 * 3. Seller creates 3 products with inventory.
 * 4. 3 customers register, each adds a product to cart and places an order.
 * 5. Seller ships all orders.
 * 6. Customers confirm delivery for all orders.
 * 7. Customers create refund requests for delivered items.
 * 8. Seller lists refund requests with pagination (limit=2, page=1).
 * 9. Validates first page returns 2 refund requests with correct metadata.
 * 10. Seller lists refund requests with pagination (limit=2, page=2).
 * 11. Validates second page returns remaining refund requests with correct pagination metadata.
 */
export async function test_api_refund_request_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
    },
  });
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // Re-login as approved seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "testpassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create 3 products with inventory
  const products = await ArrayUtil.asyncRepeat(3, async () => {
    const product =
      await generate_random_ecommerce_mall_seller_sellers_me_products_create(
        sellerConnection,
        {},
      );
    return product;
  });
  const variants: Array<{
    productId: string;
    variantId: string;
  }> = [];
  for (const product of products) {
    const variant = product.variants[0];
    variants.push({ productId: product.id, variantId: variant.id });
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: { quantityChange: 10, reason: "Initial stock for testing" },
      },
    );
  }
  // 4. Create 3 customers and place orders
  const customers: Array<{
    connection: api.IConnection;
    email: string;
    orderId: string;
    itemId: string;
    shipmentId: string;
  }> = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword123",
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    // Add to cart
    const cartItem =
      await generate_random_ecommerce_mall_customer_customers_me_cart_create(
        customerConnection,
        {
          body: {
            variantId: variants[i].variantId,
            quantity: 1,
          },
        },
      );
    // Place order
    const order =
      await generate_random_ecommerce_mall_customer_customers_me_orders_create(
        customerConnection,
        {
          body: {
            shippingAddressId: customerAuth.shippingAddresses[0].id,
          },
        },
      );
    customers.push({
      connection: customerConnection,
      email: customerAuth.email,
      orderId: order.id,
      itemId: order.orderItems[0].id,
      shipmentId: order.shipments[0].id,
    });
  }
  // 5. Seller ships all orders
  for (const customer of customers) {
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: customer.itemId },
        body: {
          itemIds: [customer.itemId],
          carrier: "DHL",
          trackingNumber: `TRACK${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  }
  // 6. Customers confirm delivery
  for (const customer of customers) {
    await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
      customer.connection,
      {
        orderId: customer.orderId,
        shipmentId: customer.shipmentId,
      },
    );
  }
  // 7. Customers create refund requests
  for (const customer of customers) {
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customer.connection,
      {
        params: { itemId: customer.itemId },
        body: { reason: "Requesting refund for testing pagination" },
      },
    );
  }
  // 8. List refund requests with pagination - page 1
  const page1 =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.index(
      sellerConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1);
  // 9. Validate first page
  TestValidator.equals(
    "Page 1 should have 2 refund requests",
    page1.data.length,
    2,
  );
  TestValidator.equals(
    "Page 1 current should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("Page 1 limit should be 2", page1.pagination.limit, 2);
  TestValidator.equals(
    "Total records should be 3",
    page1.pagination.records,
    3,
  );
  TestValidator.equals("Total pages should be 2", page1.pagination.pages, 2);
  // 10. List refund requests with pagination - page 2
  const page2 =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.index(
      sellerConnection,
      {
        body: {
          limit: 2,
          page: 2,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2);
  // 11. Validate second page
  TestValidator.equals(
    "Page 2 should have 1 refund request",
    page2.data.length,
    1,
  );
  TestValidator.equals(
    "Page 2 current should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("Page 2 limit should be 2", page2.pagination.limit, 2);
  TestValidator.equals(
    "Total records should still be 3",
    page2.pagination.records,
    3,
  );
  TestValidator.equals(
    "Total pages should still be 2",
    page2.pagination.pages,
    2,
  );
  // Validate no overlap between pages
  const page1Ids = page1.data.map((r) => r.id);
  const page2Ids = page2.data.map((r) => r.id);
  for (const id of page1Ids) {
    TestValidator.predicate(
      "Page 2 should not contain items from page 1",
      !page2Ids.includes(id),
    );
  }
}
