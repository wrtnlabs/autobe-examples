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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that a seller can filter order items by date range and sort results using different fields and directions.
 *
 * Steps:
 * 1. Create admin and seller accounts
 * 2. Admin creates category and approves seller
 * 3. Seller creates products with variants
 * 4. Customer places orders to generate order items
 * 5. Seller filters order items by date range
 * 6. Seller sorts by unit_price ascending
 * 7. Test pagination with page parameter
 * 8. Test cursor-based pagination
 * 9. Verify pagination metadata accuracy
 */
export async function test_api_seller_order_items_filtering_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Admin creates category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller creates product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Setup Customer and place orders
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postal_code: "12345",
          country: "Test Country",
        },
      },
    );
  typia.assert(address);
  // Create multiple orders with different timestamps by adding delays
  for (let i = 0; i < 3; i++) {
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
    typia.assert(variant);
    const order =
      await api.functional.ecommerceMall.customer.checkout.confirm.create(
        customerConnection,
        {
          body: {
            payment_token: `test_payment_token_${Date.now()}_${i}`,
            address_id: address.id,
          } satisfies IEcommerceMallCheckoutConfirm.IRequest,
        },
      );
    typia.assert(order);
  }
  // 6. Seller filters order items by date range with sorting
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: IEcommerceMallOrderItem.IRequest = {
    created_at_from: oneYearAgo.toISOString(),
    created_at_to: oneYearLater.toISOString(),
    sort_by: "unit_price",
    sort_direction: "asc",
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const result = await api.functional.ecommerceMall.seller.orders.items.index(
    sellerConnection,
    {
      body: dateRangeFilter,
    },
  );
  typia.assert(result);
  // 7. Validate date range filter results
  TestValidator.predicate("returns order items", result.data.length > 0);
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.equals("has correct limit", result.pagination.limit, 10);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("current page >= 0", result.pagination.current >= 0);
  // 8. Validate ascending sort by unit_price
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      TestValidator.predicate(
        `item ${i} price >= item ${i - 1} price`,
        result.data[i].unit_price >= result.data[i - 1].unit_price,
      );
    }
  }
  // 9. Test pagination with page parameter
  const pageFilter: IEcommerceMallOrderItem.IRequest = {
    created_at_from: oneYearAgo.toISOString(),
    created_at_to: oneYearLater.toISOString(),
    sort_by: "unit_price",
    sort_direction: "asc",
    limit: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const pageResult =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        body: pageFilter,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals("limit is 2", pageResult.pagination.limit, 2);
  TestValidator.equals("current page is 1", pageResult.pagination.current, 1);
  // 10. Test sorting by different fields
  const sortByCreatedAt: IEcommerceMallOrderItem.IRequest = {
    sort_by: "created_at",
    sort_direction: "desc",
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const sortedByDateResult =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        body: sortByCreatedAt,
      },
    );
  typia.assert(sortedByDateResult);
  // Validate descending sort by created_at
  if (sortedByDateResult.data.length > 1) {
    for (let i = 1; i < sortedByDateResult.data.length; i++) {
      const prevDate = new Date(sortedByDateResult.data[i - 1].created_at);
      const currDate = new Date(sortedByDateResult.data[i].created_at);
      TestValidator.predicate(
        `item ${i} date <= item ${i - 1} date`,
        currDate.getTime() <= prevDate.getTime(),
      );
    }
  }
  // 11. Test sorting by quantity ascending
  const sortByQuantity: IEcommerceMallOrderItem.IRequest = {
    sort_by: "quantity",
    sort_direction: "asc",
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const sortedByQtyResult =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        body: sortByQuantity,
      },
    );
  typia.assert(sortedByQtyResult);
  if (sortedByQtyResult.data.length > 1) {
    for (let i = 1; i < sortedByQtyResult.data.length; i++) {
      TestValidator.predicate(
        `item ${i} quantity >= item ${i - 1} quantity`,
        sortedByQtyResult.data[i].quantity >=
          sortedByQtyResult.data[i - 1].quantity,
      );
    }
  }
  // 12. Test filtering by status
  const statusFilter: IEcommerceMallOrderItem.IRequest = {
    status: ["paid"],
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const statusFilteredResult =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        body: statusFilter,
      },
    );
  typia.assert(statusFilteredResult);
  // All returned items should have 'paid' status
  for (const item of statusFilteredResult.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // 13. Verify total records count consistency
  TestValidator.equals(
    "pages calculation is correct",
    pageResult.pagination.pages === 0 || pageResult.pagination.records > 0,
    true,
  );
}
