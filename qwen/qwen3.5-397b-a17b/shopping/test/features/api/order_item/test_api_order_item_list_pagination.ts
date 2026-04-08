import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test order item list pagination with page and limit parameters.
 *
 * Validates the complete pagination functionality for order items within an order. Tests various page and limit combinations, boundary conditions, and pagination metadata accuracy. Ensures that order items are correctly paginated with proper sorting by created_at descending.
 *
 * The test creates a realistic scenario with multiple products and variants to generate an order with sufficient items for meaningful pagination testing. Multiple actors (admin, seller, member) are used to simulate the complete order creation workflow.
 *
 * 1. Administrator creates a product category for organization.
 * 2. Seller creates multiple products with variants to enable multi-item orders.
 * 3. Member registers, creates shipping address, adds variants to cart, and places order.
 * 4. Tests pagination with various page/limit combinations.
 * 5. Validates pagination metadata accuracy and item ordering.
 */
export async function test_api_order_item_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(admin);
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller setup - create products and variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Create 5 products with 2 variants each = 10 potential order items
  const products: IShoppingMallProduct[] = [];
  const allVariants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < 5; i++) {
    const product = await api.functional.shoppingMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: `Product ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          shopping_mall_category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
    typia.assert(product);
    products.push(product);
    // Create 2 variants per product
    for (let j = 0; j < 2; j++) {
      const variant = await api.functional.shoppingMall.seller.variants.create(
        sellerConnection,
        {
          body: {
            shopping_mall_product_id: product.id,
            sku_code: `SKU-${i}-${j}-${RandomGenerator.alphaNumeric(4)}`,
            option_values: `Option ${j + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
      typia.assert(variant);
      allVariants.push(variant);
    }
  }
  // 3. Member setup - join, create address, add to cart, place order
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Create shipping address
  const address = await api.functional.shoppingMall.member.addresses.create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: typia.random<string>(),
        country: "United States",
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // Add multiple variants to cart (use first 8 variants to create order with 8 items)
  const cartItems: IShoppingMallCartItem[] = [];
  for (let i = 0; i < 8 && i < allVariants.length; i++) {
    const cartItem = await api.functional.shoppingMall.member.cart.items.create(
      memberConnection,
      {
        body: {
          product_variant_id: allVariants[i].id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }
  // Place order
  const order = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderItems = order.orderItems;
  const totalRecords = orderItems.length;
  // 4. Test pagination with page=1, limit=2
  const page1Limit2 =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(page1Limit2);
  TestValidator.equals("page 1 current", page1Limit2.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Limit2.pagination.limit, 2);
  TestValidator.equals(
    "page 1 records",
    page1Limit2.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "page 1 pages",
    page1Limit2.pagination.pages,
    Math.ceil(totalRecords / 2),
  );
  TestValidator.predicate(
    "page 1 has correct items",
    page1Limit2.data.length === Math.min(2, totalRecords),
  );
  // 5. Test pagination with page=2, limit=2
  const page2Limit2 =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(page2Limit2);
  TestValidator.equals("page 2 current", page2Limit2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Limit2.pagination.limit, 2);
  TestValidator.equals(
    "page 2 records",
    page2Limit2.pagination.records,
    totalRecords,
  );
  // Verify different items on different pages
  if (page1Limit2.data.length > 0 && page2Limit2.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and 2 have different items",
      page1Limit2.data[0]?.id,
      page2Limit2.data[0]?.id ?? null,
    );
  }
  // 6. Test with limit=100 (maximum allowed)
  const page1Limit100 =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(page1Limit100);
  TestValidator.equals(
    "limit 100 current",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals("limit 100 limit", page1Limit100.pagination.limit, 100);
  TestValidator.equals(
    "limit 100 records",
    page1Limit100.pagination.records,
    totalRecords,
  );
  TestValidator.equals("limit 100 pages", page1Limit100.pagination.pages, 1);
  TestValidator.equals(
    "limit 100 data length",
    page1Limit100.data.length,
    totalRecords,
  );
  // 7. Test with limit=1 (minimum allowed)
  const page1Limit1 =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(page1Limit1);
  TestValidator.equals("limit 1 current", page1Limit1.pagination.current, 1);
  TestValidator.equals("limit 1 limit", page1Limit1.pagination.limit, 1);
  TestValidator.equals("limit 1 data length", page1Limit1.data.length, 1);
  TestValidator.equals(
    "limit 1 pages",
    page1Limit1.pagination.pages,
    totalRecords,
  );
  // 8. Test default pagination (no page/limit specified)
  const defaultPagination =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default current",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultPagination.pagination.limit, 20);
  TestValidator.equals(
    "default records",
    defaultPagination.pagination.records,
    totalRecords,
  );
  // 9. Verify items are ordered by created_at descending
  if (defaultPagination.data.length > 1) {
    for (let i = 1; i < defaultPagination.data.length; i++) {
      const prevDate = new Date(
        defaultPagination.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(defaultPagination.data[i].created_at).getTime();
      TestValidator.predicate(
        `items ordered by created_at desc (${i - 1} vs ${i})`,
        prevDate >= currDate,
      );
    }
  }
  // 10. Test with status filter
  const paidFilter =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidFilter);
  TestValidator.equals(
    "paid filter records",
    paidFilter.pagination.records,
    totalRecords,
  );
  TestValidator.predicate(
    "all filtered items have paid status",
    paidFilter.data.every((item) => item.status === "paid"),
  );
}
