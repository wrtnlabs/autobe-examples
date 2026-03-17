import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test the primary success path where an authenticated seller retrieves their order items with filtering by status.
 * The seller should be able to view paginated order items for products they own, filter by fulfillment status (paid, shipped, delivered),
 * and verify that only their own order items are returned. This validates the core business workflow of a seller monitoring sales and preparing shipments.
 * Test should verify response includes product summaries, variant details, and preserved purchase prices.
 */
export async function test_api_order_item_seller_dashboard_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com",
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic devices and accessories",
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com",
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        categoryId: category.id,
        basePrice: 199.99,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "WH-001-BLK",
          options: [{ optionName: "Color", optionValue: "Black" }],
          price: 199.99,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 3. Customer setup - add to cart and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer123!",
    },
  });
  const cartItem = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  typia.assert(cartItem);
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "John Doe",
        recipientPhone: "010-1234-5678",
        streetAddress: "123 Main Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(order);
  // 4. Seller retrieves order items with filtering
  // Test without filters - should return the order item
  const allItems = await api.functional.ecommerceMall.seller.orderItems.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(allItems);
  TestValidator.predicate(
    "order items should be returned",
    allItems.data.length > 0,
  );
  TestValidator.predicate(
    "order item should belong to seller",
    allItems.data.every((item) => item.seller.id === sellerAuth.id),
  );
  // Find the order item for our product
  const orderItem = allItems.data.find(
    (item) => item.product.id === product.id && item.variant.id === variant.id,
  );
  if (!orderItem) throw new Error("Order item not found");
  TestValidator.equals("order item quantity", orderItem.quantity, 2);
  TestValidator.equals(
    "order item price at purchase",
    orderItem.priceAtPurchase,
    199.99,
  );
  TestValidator.equals("order item status", orderItem.status, "paid");
  TestValidator.equals(
    "order item product name",
    orderItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "order item variant sku",
    orderItem.variant.skuCode,
    variant.skuCode,
  );
  // Test filtering by status - paid
  const paidItems = await api.functional.ecommerceMall.seller.orderItems.index(
    sellerConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(paidItems);
  TestValidator.predicate(
    "paid items should include our order item",
    paidItems.data.some((item) => item.id === orderItem.id),
  );
  TestValidator.predicate(
    "all returned items should have paid status",
    paidItems.data.every((item) => item.status === "paid"),
  );
  // Test filtering by product ID
  const productItems =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          productId: product.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(productItems);
  TestValidator.predicate(
    "product filter should return order items for specific product",
    productItems.data.every((item) => item.product.id === product.id),
  );
  // Test pagination
  const paginatedItems =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paginatedItems);
  TestValidator.equals(
    "pagination current page",
    paginatedItems.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedItems.pagination.limit, 5);
  TestValidator.predicate(
    "pagination data length should not exceed limit",
    paginatedItems.data.length <= 5,
  );
  // Verify response structure includes all required fields
  const firstItem = allItems.data[0];
  typia.assert(firstItem);
  TestValidator.predicate(
    "order item has required fields",
    firstItem.id !== undefined &&
      firstItem.quantity !== undefined &&
      firstItem.priceAtPurchase !== undefined &&
      firstItem.status !== undefined &&
      firstItem.createdAt !== undefined &&
      firstItem.product !== undefined &&
      firstItem.variant !== undefined &&
      firstItem.seller !== undefined,
  );
}