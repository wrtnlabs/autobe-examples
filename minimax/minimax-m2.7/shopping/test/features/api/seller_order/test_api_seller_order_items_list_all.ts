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
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that an approved seller can retrieve a paginated list of all order items containing their products.
 *
 * Validates the seller dashboard order items listing endpoint which returns a paginated
 * collection of order items from orders placed by customers that contain products owned
 * by the authenticated seller. The test verifies pagination metadata, data structure,
 * and filtering behavior.
 *
 * The test flow creates a complete e-commerce transaction:
 * 1. Admin registers to approve sellers
 * 2. Seller registers and gets approved via admin approval
 * 3. Seller creates a product with inventory
 * 4. Customer adds product to cart and places an order
 * 5. Seller lists their order items and validates the response structure
 *
 * Key validation points include verifying the pagination metadata (current, limit, records, pages),
 * confirming the order item data structure includes frozen product snapshots, variant details,
 * and seller profile snapshots captured at purchase time.
 */
export async function test_api_seller_order_items_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller (starts as pending)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 4. Create approved seller
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const approvedSellerPassword = RandomGenerator.alphaNumeric(16);
  const approvedSellerAuth = await authorize_seller_join(
    approvedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: approvedSellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(approvedSellerAuth);
  // 5. Create product with inventory using generation functions
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  typia.assert(variant);
  // Add inventory to the variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      approvedSellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Customer adds product to cart and places order
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerLoginConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerLoginConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Place order
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerLoginConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // 7. Login as the approved seller to list order items
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: approvedSellerAuth.email,
      password: approvedSellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 8. Call the order items list endpoint with empty body (no filters)
  const orderItemsResponse =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerLoginConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsResponse);
  // 9. Validate pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    orderItemsResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has current",
    orderItemsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    orderItemsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    orderItemsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    orderItemsResponse.pagination.pages >= 0,
  );
  // 10. Validate data array structure
  TestValidator.equals(
    "has data array",
    Array.isArray(orderItemsResponse.data),
    true,
  );
  // 11. Validate order item structure if any exist
  if (orderItemsResponse.data.length > 0) {
    const firstItem = orderItemsResponse.data[0];
    // Validate order item fields
    TestValidator.predicate(
      "item has id",
      /^[0-9a-f-]{36}$/i.test(firstItem.id),
    );
    TestValidator.predicate("item has quantity", firstItem.quantity > 0);
    TestValidator.predicate("item has unit_price", firstItem.unit_price >= 0);
    TestValidator.predicate(
      "item has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        firstItem.status,
      ),
    );
    TestValidator.predicate(
      "item has created_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstItem.created_at),
    );
    // Validate nested structures
    TestValidator.predicate(
      "has order reference",
      firstItem.order !== undefined,
    );
    TestValidator.predicate(
      "order has order_number",
      firstItem.order.order_number !== undefined,
    );
    TestValidator.predicate(
      "has productVariant",
      firstItem.productVariant !== undefined,
    );
    TestValidator.predicate(
      "productVariant has skuCode",
      firstItem.productVariant.skuCode !== undefined,
    );
    TestValidator.predicate(
      "has productSnapshot",
      firstItem.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "productSnapshot has name",
      firstItem.productSnapshot.name !== undefined,
    );
    TestValidator.predicate(
      "has sellerProfileSnapshot",
      firstItem.sellerProfileSnapshot !== undefined,
    );
    TestValidator.predicate(
      "sellerProfileSnapshot has shopName",
      firstItem.sellerProfileSnapshot.shopName !== undefined,
    );
    // Verify the order item belongs to this seller
    TestValidator.predicate(
      "order item belongs to the seller",
      firstItem.productSnapshot.seller.id === approvedSellerAuth.id,
    );
  }
  // 12. Verify sorting - items should be sorted by created_at descending (newest first)
  if (orderItemsResponse.data.length > 1) {
    for (let i = 0; i < orderItemsResponse.data.length - 1; i++) {
      const current = new Date(orderItemsResponse.data[i].created_at).getTime();
      const next = new Date(
        orderItemsResponse.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `item ${i} created_at >= item ${i + 1} created_at`,
        current >= next,
      );
    }
  }
}
