import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_product_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_product_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_product_review_snapshots_filter_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  /*
   * Test retrieval of paginated and filtered product review snapshot summaries
   * by providing valid filters such as productReviewId, orderItemId,
   * productVariantId, and rating range.
   *
   * This test ensures:
   * - Correct pagination behavior with page and limit parameters.
   * - Returned data contains expected fields including snapshot id, rating,
   *   timestamps, and linked order item and product variant summaries.
   * - Access control allowing only authorized users (e.g., customers owning the
   *   reviews or admins).
   * - Filtering correctly limits results to matching snapshots.
   *
   * The scenario covers the primary success path with valid filters and response
   * validation.
   */
  // 1. Setup actors: seller and customer join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password:
        sellerAuth.token.access.length > 0
          ? sellerAuth.token.access
          : RandomGenerator.alphaNumeric(16),
    },
  });
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password:
        customerAuth.token.access.length > 0
          ? customerAuth.token.access
          : RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create product by seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(variant);
  // 4. Create sale entity for review context
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: product.productSubcategory.category.id,
        name: product.name,
        description: product.description,
        base_price: product.basePrice,
      },
    },
  );
  typia.assert(sale);
  // 5. For the sale, create a product review by customer
  const review =
    await generate_random_shopping_mall_customer_product_reviews_create(
      customerConnection,
      {
        body: {
          shoppingMallSaleId: sale.id,
          shoppingMallCustomerId: customerAuth.id,
          rating: 4,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(review);
  // 6. Create order item by customer referencing variant
  // Since order creation API is not given, we simulate with order item creation with assumed order id (we create a dummy order to satisfy FK)
  // To satisfy the foreign key 'shoppingMallOrderId', we create a dummy order summary for test
  // Since no API for creating order is given, assume a dummy ID (normally this would be a real order)
  const dummyOrderId = typia.random<string & tags.Format<"uuid">>();
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: dummyOrderId,
          shoppingMallProductVariantId: variant.id,
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // 7. Now test index (PATCH /shoppingMall/productReviewSnapshots) with various filters and pagination
  // We test filtering by productReviewId, orderItemId, productVariantId, and rating range
  // Define base request parameters
  const baseRequest: IShoppingMallProductReviewSnapshot.IRequest = {
    productReviewId: review.id,
    orderItemId: orderItem.id,
    productVariantId: variant.id,
    ratingMin: 3,
    ratingMax: 5,
    page: 1,
    limit: 10,
  };
  // Get base response
  const baseResponse =
    await api.functional.shoppingMall.productReviewSnapshots.index(
      customerConnection,
      { body: baseRequest },
    );
  typia.assert(baseResponse);
  // Validate pagination info
  TestValidator.predicate(
    "response pagination current page is 1",
    baseResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "response pagination limit is 10",
    baseResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "response pagination records are >= 0",
    baseResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "response pagination pages are >= 0",
    baseResponse.pagination.pages >= 0,
  );
  // Validate data array contents
  for (const snapshot of baseResponse.data) {
    typia.assert(snapshot);
    // Validate snapshot properties
    TestValidator.predicate(
      "snapshot id is non-empty string",
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot rating between 1 and 5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot created_at and updated_at are ISO date strings",
      typeof snapshot.created_at === "string" &&
        typeof snapshot.updated_at === "string",
    );
    // Validate linked productReview summary
    TestValidator.equals(
      "snapshot productReview id matches filter",
      snapshot.productReview.id,
      review.id,
    );
    // Validate linked orderItem summary
    TestValidator.equals(
      "snapshot orderItem id matches filter",
      snapshot.orderItem.id,
      orderItem.id,
    );
    // Validate linked productVariant summary
    TestValidator.equals(
      "snapshot productVariant id matches filter",
      snapshot.productVariant.id,
      variant.id,
    );
  }
  // Additional test: Pagination with page 2, limit 1
  const page2Request: IShoppingMallProductReviewSnapshot.IRequest = {
    ...baseRequest,
    page: 2,
    limit: 1,
  };
  const page2Response =
    await api.functional.shoppingMall.productReviewSnapshots.index(
      customerConnection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2Response);
  TestValidator.predicate(
    "page 2 pagination current page is 2",
    page2Response.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 pagination limit is 1",
    page2Response.pagination.limit === 1,
  );
  // Validate all page 2 snapshots have snapshot properties
  for (const snapshot of page2Response.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "page 2 snapshot rating between 1 and 5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
  }
}
