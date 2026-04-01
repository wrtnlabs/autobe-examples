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

export async function test_api_product_review_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer creates an order for the product
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID for shipment
  const orderItemId = order.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("Order must have at least one item");
  }
  // 5. Seller creates shipment for the order
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: [orderItemId],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Create multiple reviews (6 reviews to test pagination with limit=2)
  const reviewCount = 6;
  const reviews: IShoppingMallReview[] = [];
  for (let i = 0; i < reviewCount; i++) {
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
    const review = await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
          order_id: order.id,
          rating: ((i % 5) + 1) as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content: `Review content ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    typia.assert(review);
    reviews.push(review);
  }
  // 8. Test pagination: First page (page=1, limit=2)
  const page1Result =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 has 2 reviews", page1Result.data.length, 2);
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    6,
  );
  TestValidator.equals("page 1 total pages", page1Result.pagination.pages, 3);
  // 9. Test pagination: Second page (page=2, limit=2)
  const page2Result =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 has 2 reviews", page2Result.data.length, 2);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // 10. Test pagination: Third page (page=3, limit=2)
  const page3Result =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 3,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals("page 3 has 2 reviews", page3Result.data.length, 2);
  TestValidator.equals(
    "page 3 current page",
    page3Result.pagination.current,
    3,
  );
  // 11. Test edge case: Page beyond available pages (page=10, limit=2)
  const pageBeyondResult =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 10,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(pageBeyondResult);
  TestValidator.equals(
    "page beyond has 0 reviews",
    pageBeyondResult.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond current page",
    pageBeyondResult.pagination.current,
    10,
  );
  // 12. Test sorting: Default sort (created_at DESC - newest first)
  const defaultSortResult =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  // Verify reviews are sorted by created_at DESC (newest first)
  if (defaultSortResult.data.length > 1) {
    for (let i = 0; i < defaultSortResult.data.length - 1; i++) {
      const currentReview = defaultSortResult.data[i];
      const nextReview = defaultSortResult.data[i + 1];
      TestValidator.predicate(
        `review ${i} is newer than review ${i + 1}`,
        new Date(currentReview.created_at).getTime() >=
          new Date(nextReview.created_at).getTime(),
      );
    }
  }
  // 13. Test sorting: Custom sort by rating ASC
  const ratingAscResult =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "rating ASC",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(ratingAscResult);
  // Verify reviews are sorted by rating ASC (lowest first)
  if (ratingAscResult.data.length > 1) {
    for (let i = 0; i < ratingAscResult.data.length - 1; i++) {
      const currentReview = ratingAscResult.data[i];
      const nextReview = ratingAscResult.data[i + 1];
      TestValidator.predicate(
        `review ${i} rating <= review ${i + 1} rating`,
        currentReview.rating <= nextReview.rating,
      );
    }
  }
  // 14. Test sorting: Custom sort by rating DESC
  const ratingDescResult =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "rating DESC",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(ratingDescResult);
  // Verify reviews are sorted by rating DESC (highest first)
  if (ratingDescResult.data.length > 1) {
    for (let i = 0; i < ratingDescResult.data.length - 1; i++) {
      const currentReview = ratingDescResult.data[i];
      const nextReview = ratingDescResult.data[i + 1];
      TestValidator.predicate(
        `review ${i} rating >= review ${i + 1} rating`,
        currentReview.rating >= nextReview.rating,
      );
    }
  }
}
