import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the retrieval of a review detail after creation.
 *
 * 1. Prepare a valid review creation body and create the review via POST
 *    /shoppingMall/reviews.
 * 2. Retrieve the review by ID via GET /shoppingMall/reviews/{reviewId}.
 * 3. Assert all key properties are present and match the creation (content,
 *    relational summaries, status, timestamps, etc).
 * 4. Test the error handling for a non-existent review ID.
 */
export async function test_api_review_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a review with API-complete purchase context and valid content
  // Generate summaries directly for association fields (simulate 'purchased' scenario)
  const customer: IShoppingMallCustomer.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
  };
  const session: IShoppingMallCustomerSession.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    expired_at: new Date(Date.now() + 3_600_000).toISOString(),
    last_active_at: new Date().toISOString(),
    ip: "127.0.0.1",
    href: "https://test/landing",
    referrer: "https://test/start",
    user_agent: "Mozilla/5.0",
  };
  const product: IShoppingMallProduct.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    default_price: 9900,
    business_status: RandomGenerator.pick([
      "published",
      "draft",
      "blocked",
    ] as const),
    seller: {
      id: typia.random<string & tags.Format<"uuid">>(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
    },
    categories: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 1 }),
      },
    ],
    created_at: new Date().toISOString(),
  };
  const sku: IShoppingMallProductSku.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(10),
    product_title: product.title,
    option_summary: RandomGenerator.paragraph({ sentences: 1 }),
    in_stock: true,
  };
  const order: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: RandomGenerator.pick([
      "pending",
      "paid",
      "delivered",
      "cancelled",
    ] as const),
    total_amount: 9900,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const orderItem: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: order.id,
    sku,
    quantity: 1,
    unit_price: 9900,
    subtotal: 9900,
    currency: "KRW",
    delivered: true,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const rating: IShoppingMallProductRating.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    value: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    customer,
    product,
    productSku: sku,
  };

  // Now create the review; values for association IDs are taken from above
  const createBody = {
    title: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }) as string & tags.MinLength<1>,
    body: RandomGenerator.paragraph({
      sentences: 15,
      wordMin: 3,
      wordMax: 8,
    }) as string & tags.MinLength<10> & tags.MaxLength<1000>,
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: orderItem.id,
    shopping_mall_product_rating_id: rating.id,
    is_draft: RandomGenerator.pick([false, true]),
    moderation_status: RandomGenerator.pick([
      "pending",
      "approved",
      "rejected",
    ] as const),
    withdrawn_at: null,
  } satisfies IShoppingMallReview.ICreate;

  const created: IShoppingMallReview =
    await api.functional.shoppingMall.reviews.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. Retrieve the review detail
  const detail: IShoppingMallReview =
    await api.functional.shoppingMall.reviews.at(connection, {
      reviewId: created.id,
    });
  typia.assert(detail);
  // 3. Check core fields & associations
  TestValidator.equals("review id matches", detail.id, created.id);
  TestValidator.equals("review title matches", detail.title, createBody.title);
  TestValidator.equals("review body matches", detail.body, createBody.body);
  TestValidator.equals(
    "is_draft flag matches",
    detail.is_draft,
    createBody.is_draft,
  );
  TestValidator.equals(
    "moderation status matches",
    detail.moderation_status,
    createBody.moderation_status,
  );
  TestValidator.equals(
    "withdrawn_at matches",
    detail.withdrawn_at,
    createBody.withdrawn_at,
  );
  TestValidator.predicate(
    "review created_at is string",
    typeof detail.created_at === "string",
  );
  TestValidator.predicate(
    "review updated_at is string",
    typeof detail.updated_at === "string",
  );
  TestValidator.equals("customer id matches", detail.customer.id, customer.id);
  TestValidator.equals(
    "customer name matches",
    detail.customer.name,
    customer.name,
  );
  TestValidator.equals("product id matches", detail.product.id, product.id);
  TestValidator.equals("sku id matches", detail.productSku.id, sku.id);
  TestValidator.equals("order id matches", detail.order.id, order.id);
  TestValidator.equals(
    "order item id matches",
    detail.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals("rating id matches", detail.rating.id, rating.id);
  // Check session summary fields
  TestValidator.equals(
    "session id matches",
    detail.customerSession.id,
    session.id,
  );
  // Categories reference
  TestValidator.equals(
    "product categories match",
    detail.product.categories,
    product.categories,
  );

  // 4. Error scenario: retrieve non-existent review, expect API error
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent review throws error",
    async () => {
      await api.functional.shoppingMall.reviews.at(connection, {
        reviewId: nonExistentReviewId,
      });
    },
  );
}
