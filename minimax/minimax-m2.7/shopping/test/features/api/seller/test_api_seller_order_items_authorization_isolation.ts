import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test seller order items authorization isolation.
 *
 * Verifies that when a seller queries order items via PATCH /ecommerceMall/seller/orders/items,
 * the system automatically filters results to only show items belonging to products
 * created by that specific seller. A seller should NEVER see order items from another
 * seller's products.
 *
 * Test flow:
 * 1. Admin creates category for products
 * 2. Register and approve two sellers (Seller A and Seller B)
 * 3. Each seller creates a product with variants
 * 4. Customer creates shipping address
 * 5. Customer adds both sellers' products to cart and completes checkout
 * 6. Seller A queries order items - verify only their items returned
 * 7. Seller B queries order items - verify only their items returned
 * 8. Verify seller_id isolation is automatically enforced based on session
 */
export async function test_api_seller_order_items_authorization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // STEP 1: Admin Setup - Create category for products
  // ============================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // ============================================
  // STEP 2: Register two sellers (both will be pending approval)
  // ============================================
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerARegistration = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(sellerARegistration);
  const sellerAId = sellerARegistration.id;
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBRegistration = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(sellerBRegistration);
  const sellerBId = sellerBRegistration.id;
  // ============================================
  // STEP 3: Admin approves both sellers
  // ============================================
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerAId,
        status: "approved",
      },
    },
  );
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerBId,
        status: "approved",
      },
    },
  );
  // Re-authenticate as approved sellers to get updated session
  const sellerALoginBody: IEcommerceMallSeller.ILogin = {
    email: sellerARegistration.email,
    password: "password123",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  };
  const sellerBLoginBody: IEcommerceMallSeller.ILogin = {
    email: sellerBRegistration.email,
    password: "password123",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  };
  // ============================================
  // STEP 4: Each seller creates a product
  // ============================================
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: "Seller A Product",
          description: "This is a product from Seller A",
          base_price: 1000,
          category_id: category.id,
        },
      },
    );
  typia.assert(sellerAProduct);
  const sellerAProductId = sellerAProduct.id;
  const sellerBProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: "Seller B Product",
          description: "This is a product from Seller B",
          base_price: 2000,
          category_id: category.id,
        },
      },
    );
  typia.assert(sellerBProduct);
  const sellerBProductId = sellerBProduct.id;
  // Get variants from each product (products created via SDK should have variants)
  const sellerAVariantId = sellerAProduct.variants[0]?.id;
  const sellerBVariantId = sellerBProduct.variants[0]?.id;
  // Ensure we have variants to test with
  if (!sellerAVariantId || !sellerBVariantId) {
    throw new Error("Products must have at least one variant");
  }
  // ============================================
  // STEP 5: Customer registration and setup
  // ============================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerRegistration = await authorize_customer_join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "customer123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      },
    },
  );
  typia.assert(customerRegistration);
  // Create shipping address
  const shippingAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "USA",
          is_default: true,
        },
      },
    );
  typia.assert(shippingAddress);
  // ============================================
  // STEP 6: Customer adds both products to cart
  // ============================================
  // Add Seller A's product to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: sellerAVariantId,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  // Add Seller B's product to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: sellerBVariantId,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  // ============================================
  // STEP 7: Customer completes checkout
  // ============================================
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "mock_payment_token",
          address_id: shippingAddress.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Verify order contains items from both sellers
  TestValidator.equals(
    "order has items from both sellers",
    true,
    order.orderItems.length >= 2,
  );
  // Find which item belongs to which seller
  const sellerAOrderItem = order.orderItems.find(
    (item) => item.productSnapshot.name === "Seller A Product",
  );
  const sellerBOrderItem = order.orderItems.find(
    (item) => item.productSnapshot.name === "Seller B Product",
  );
  TestValidator.predicate("order contains Seller A item", !!sellerAOrderItem);
  TestValidator.predicate("order contains Seller B item", !!sellerBOrderItem);
  // ============================================
  // STEP 8: Seller A queries order items - verify isolation
  // ============================================
  // Re-authenticate as Seller A
  const sellerAConnForQuery: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAConnForQuery, {
    body: sellerALoginBody,
  });
  const sellerAOrderItemsResponse =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerAConnForQuery,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerAOrderItemsResponse);
  // Seller A should only see their own items
  TestValidator.equals(
    "Seller A sees items from their products only",
    sellerAOrderItemsResponse.data.length,
    sellerAOrderItemsResponse.data.filter(
      (item) => item.productSnapshot.name === "Seller A Product",
    ).length,
  );
  // Verify no items from Seller B appear
  const sellerAContainsSellerBItems = sellerAOrderItemsResponse.data.some(
    (item) => item.productSnapshot.name === "Seller B Product",
  );
  TestValidator.equals(
    "Seller A should NOT see Seller B\'s items",
    sellerAContainsSellerBItems,
    false,
  );
  // Verify that Seller A's items reference their product
  for (const item of sellerAOrderItemsResponse.data) {
    TestValidator.equals(
      "Each item belongs to Seller A\'s product",
      item.productSnapshot.name,
      "Seller A Product",
    );
  }
  // ============================================
  // STEP 9: Seller B queries order items - verify isolation
  // ============================================
  // Re-authenticate as Seller B
  const sellerBConnForQuery: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBConnForQuery, {
    body: sellerBLoginBody,
  });
  const sellerBOrderItemsResponse =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerBConnForQuery,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerBOrderItemsResponse);
  // Seller B should only see their own items
  TestValidator.equals(
    "Seller B sees items from their products only",
    sellerBOrderItemsResponse.data.length,
    sellerBOrderItemsResponse.data.filter(
      (item) => item.productSnapshot.name === "Seller B Product",
    ).length,
  );
  // Verify no items from Seller A appear
  const sellerBContainsSellerAItems = sellerBOrderItemsResponse.data.some(
    (item) => item.productSnapshot.name === "Seller A Product",
  );
  TestValidator.equals(
    "Seller B should NOT see Seller A\'s items",
    sellerBContainsSellerAItems,
    false,
  );
  // Verify that Seller B's items reference their product
  for (const item of sellerBOrderItemsResponse.data) {
    TestValidator.equals(
      "Each item belongs to Seller B\'s product",
      item.productSnapshot.name,
      "Seller B Product",
    );
  }
  // ============================================
  // STEP 10: Verify seller_id filter isolation
  // ============================================
  // Both sellers should see different items (proving automatic seller_id filtering)
  TestValidator.notEquals(
    "Seller A and Seller B should see different order items",
    sellerAOrderItemsResponse.data.map((i) => i.id),
    sellerBOrderItemsResponse.data.map((i) => i.id),
  );
  // The items Seller A sees should NOT be in Seller B's results
  const sellerAItemIds = sellerAOrderItemsResponse.data.map((i) => i.id);
  const sellerBItemIds = sellerBOrderItemsResponse.data.map((i) => i.id);
  const overlappingIds = sellerAItemIds.filter((id) =>
    sellerBItemIds.includes(id),
  );
  TestValidator.equals(
    "No overlapping order items between sellers",
    overlappingIds.length,
    0,
  );
}