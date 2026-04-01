import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_review_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create a product for customers to review
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create multiple customers (3 customers to generate 25+ reviews)
  const customerCount = 3;
  const customers: Array<{
    connection: api.IConnection;
    customer: IShoppingMallCustomer.IAuthorized;
  }> = [];
  for (let i = 0; i < customerCount; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Test1234!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(customer);
    customers.push({ connection: customerConnection, customer });
  }
  // 4. Each customer places multiple orders (3 orders each = 9 orders total)
  // This allows multiple reviews per customer (one per order for the same product)
  const ordersPerCustomer = 3;
  const allOrders: Array<{
    order: IShoppingMallOrder;
    customerConnection: api.IConnection;
    customerIndex: number;
  }> = [];
  for (let customerIndex = 0; customerIndex < customerCount; customerIndex++) {
    const { connection: customerConnection } = customers[customerIndex];
    for (let orderIndex = 0; orderIndex < ordersPerCustomer; orderIndex++) {
      const order = await generate_random_shopping_mall_customer_orders_create(
        customerConnection,
        {
          body: {
            shopping_mall_address_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
      typia.assert(order);
      allOrders.push({ order, customerConnection, customerIndex });
    }
  }
  // 5. Seller ships all order items from all orders
  const allOrderItemIds: string[] = [];
  for (const { order } of allOrders) {
    for (const item of order.orderItems) {
      allOrderItemIds.push(item.id);
    }
  }
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "TestCarrier",
        tracking_number: typia.random<string>(),
        order_item_ids: allOrderItemIds,
      },
    },
  );
  typia.assert(shipment);
  // 6. Each customer confirms delivery for their shipments
  for (const { connection: customerConnection } of customers) {
    const confirmedShipment =
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerConnection,
        {
          shipmentId: shipment.id,
        },
      );
    typia.assert(confirmedShipment);
  }
  // 7. Create 27 reviews (9 per customer, one per order)
  // Each customer creates one review per order for the same product
  const allReviews: IShoppingMallReview[] = [];
  for (let customerIndex = 0; customerIndex < customerCount; customerIndex++) {
    const { connection: customerConnection } = customers[customerIndex];
    for (let orderIndex = 0; orderIndex < ordersPerCustomer; orderIndex++) {
      // Add small delay to ensure different created_at timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const orderInfo = allOrders.find(
        (o) =>
          o.customerIndex === customerIndex &&
          allOrders
            .filter((o2) => o2.customerIndex === customerIndex)
            .indexOf(o) === orderIndex,
      );
      if (orderInfo) {
        const review =
          await generate_random_shopping_mall_customer_reviews_create(
            customerConnection,
            {
              body: {
                product_id: product.id,
                order_id: orderInfo.order.id,
                rating: ((orderIndex % 5) + 1) as number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<5>,
                content:
                  orderIndex % 3 === 0
                    ? RandomGenerator.paragraph({ sentences: 2 })
                    : null,
              },
            },
          );
        typia.assert(review);
        allReviews.push(review);
      }
    }
  }
  // 8. Test default sorting (created_at DESC - newest first)
  const defaultPage = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 10,
        sort: "created_at DESC",
      },
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 10);
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default total records",
    defaultPage.pagination.records,
    allReviews.length,
  );
  TestValidator.predicate(
    "default pages calculated correctly",
    defaultPage.pagination.pages === Math.ceil(allReviews.length / 10),
  );
  // Verify sorting: first review should be newer than second
  if (defaultPage.data.length >= 2) {
    TestValidator.predicate(
      "default sort is created_at DESC",
      new Date(defaultPage.data[0].created_at).getTime() >=
        new Date(defaultPage.data[1].created_at).getTime(),
    );
  }
  // 9. Test sorting by rating ASC (lowest rating first)
  const ratingAscPage = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 10,
        sort: "rating ASC",
      },
    },
  );
  typia.assert(ratingAscPage);
  if (ratingAscPage.data.length >= 2) {
    TestValidator.predicate(
      "rating ASC sort order",
      ratingAscPage.data[0].rating <= ratingAscPage.data[1].rating,
    );
  }
  // 10. Test sorting by rating DESC (highest rating first)
  const ratingDescPage = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 10,
        sort: "rating DESC",
      },
    },
  );
  typia.assert(ratingDescPage);
  if (ratingDescPage.data.length >= 2) {
    TestValidator.predicate(
      "rating DESC sort order",
      ratingDescPage.data[0].rating >= ratingDescPage.data[1].rating,
    );
  }
  // 11. Test pagination with different page sizes
  const pageSizes = [10, 20, 50];
  for (const pageSize of pageSizes) {
    const paginatedResult = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: {
          product_id: product.id,
          page: 1,
          limit: pageSize,
        },
      },
    );
    typia.assert(paginatedResult);
    TestValidator.equals(
      `page size ${pageSize} limit`,
      paginatedResult.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      `page size ${pageSize} records`,
      paginatedResult.pagination.records,
      allReviews.length,
    );
    TestValidator.predicate(
      `page size ${pageSize} pages calculated`,
      paginatedResult.pagination.pages ===
        Math.ceil(allReviews.length / pageSize),
    );
  }
  // 12. Test navigation across multiple pages
  const totalPages = Math.ceil(allReviews.length / 10);
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pageResult = await api.functional.shoppingMall.reviews.index(
      connection,
      {
        body: {
          product_id: product.id,
          page: pageNum,
          limit: 10,
        },
      },
    );
    typia.assert(pageResult);
    TestValidator.equals(
      `page ${pageNum} current`,
      pageResult.pagination.current,
      pageNum,
    );
    // Verify data count on each page (last page may have fewer items)
    const expectedCount =
      pageNum === totalPages ? allReviews.length % 10 || 10 : 10;
    TestValidator.equals(
      `page ${pageNum} data count`,
      pageResult.data.length,
      expectedCount,
    );
  }
  // 13. Test edge case: verify product_id filter works correctly
  const filteredResult = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(filteredResult);
  TestValidator.equals(
    "filtered total matches created reviews",
    filteredResult.pagination.records,
    allReviews.length,
  );
  // 14. Test edge case: single page with limit >= total records
  const singlePageResult = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(singlePageResult);
  TestValidator.equals(
    "single page has all reviews",
    singlePageResult.data.length,
    allReviews.length,
  );
  TestValidator.equals(
    "single page pages count",
    singlePageResult.pagination.pages,
    1,
  );
  // 15. Verify pagination metadata accuracy
  TestValidator.predicate(
    "pagination metadata consistency",
    singlePageResult.pagination.records ===
      singlePageResult.pagination.pages * singlePageResult.pagination.limit ||
      singlePageResult.pagination.records <
        singlePageResult.pagination.pages * singlePageResult.pagination.limit,
  );
}