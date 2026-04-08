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
 * Test order item list filtering by fulfillment status.
 *
 * Validates the complete order item filtering functionality including status-based filtering, pagination metadata accuracy, and search field matching. Tests that members can correctly filter their order items by fulfillment status and that pagination metadata reflects the filtered result count rather than total items.
 *
 * The test establishes a complete e-commerce workflow: administrator creates category, seller creates product with variant, member places order, then validates filtering behavior on the order items endpoint.
 *
 * 1. Administrator creates product category for organization.
 * 2. Seller creates product and variant with inventory.
 * 3. Member creates address, adds item to cart, places order.
 * 4. Member retrieves order items with status filter 'paid'.
 * 5. Validates all returned items match the filtered status.
 * 6. Tests pagination metadata reflects filtered count.
 * 7. Tests unfiltered retrieval returns all items.
 * 8. Tests search field partial matching on product names.
 * 9. Tests combined filters (status + search) work correctly.
 */
export async function test_api_order_item_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // 2. Seller setup - create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
      },
    },
  );
  typia.assert(variant);
  // 3. Member setup - join, create address, add to cart, place order
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const address =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(address);
  await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 4. Test status filter - 'paid' status (newly created orders are in 'paid' status)
  const paidFilterResult =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidFilterResult);
  // Validate all returned items have 'paid' status
  TestValidator.predicate("all items have paid status", () =>
    paidFilterResult.data.every((item) => item.status === "paid"),
  );
  // Validate pagination metadata reflects filtered count
  TestValidator.equals(
    "records count matches filtered items",
    paidFilterResult.pagination.records,
    paidFilterResult.data.length,
  );
  // 5. Test unfiltered retrieval - should return all items regardless of status
  const unfilteredResult =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(unfilteredResult);
  TestValidator.predicate(
    "unfiltered returns all items",
    () => unfilteredResult.data.length >= paidFilterResult.data.length,
  );
  // Validate unfiltered pagination metadata
  TestValidator.equals(
    "unfiltered records count matches items",
    unfilteredResult.pagination.records,
    unfilteredResult.data.length,
  );
  // 6. Test search field with product name partial match
  const searchKeyword = product.name.substring(
    0,
    Math.min(5, product.name.length),
  );
  const searchResult =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          search: searchKeyword,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate search returns matching items (case-insensitive partial match)
  TestValidator.predicate("search returns matching items", () =>
    searchResult.data.every((item) =>
      item.product.name.toLowerCase().includes(searchKeyword.toLowerCase()),
    ),
  );
  // 7. Test combined filters (status + search)
  const combinedResult =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
          search: searchKeyword,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filter results
  TestValidator.predicate("combined filter - status matches", () =>
    combinedResult.data.every((item) => item.status === "paid"),
  );
  TestValidator.predicate("combined filter - search matches", () =>
    combinedResult.data.every((item) =>
      item.product.name.toLowerCase().includes(searchKeyword.toLowerCase()),
    ),
  );
  // 8. Test date range filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.member.orders.items.index(
      memberConnection,
      {
        orderId: order.id,
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // All items should be within the date range (since order was just created)
  TestValidator.predicate("date range filter returns recent items", () =>
    dateRangeResult.data.every((item) => {
      const itemDate = new Date(item.created_at);
      return itemDate >= oneDayAgo && itemDate <= now;
    }),
  );
}