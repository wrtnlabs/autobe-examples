import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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
import { generate_random_shopping_mall_customer_sales_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_sales_reviews_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_sale_review_retrieve_detailed_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve detailed info for a sale's specific customer review.
  // 1. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssword123",
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(sellerJoin);
  // 2. Seller login (to refresh token and ensure login flow)
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "StrongP@ssword123",
    },
  });
  // 3. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: Number((Math.random() * 1000 + 10).toFixed(2)),
      },
    },
  );
  typia.assert(sale);
  // 4. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerP@ss1234",
    },
  });
  typia.assert(customerJoin);
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: "CustomerP@ss1234",
    },
  });
  // 5. Customer creates a review for the sale
  const review =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      customerConnection,
      {
        params: { saleId: sale.id },
        body: {
          shoppingMallSaleId: sale.id,
          shoppingMallCustomerId: customerJoin.id,
          rating: randint(1, 5),
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(review);
  // 6. Seller retrieves the review detail successfully
  const reviewDetail = await api.functional.shoppingMall.sales.reviews.at(
    sellerConnection,
    {
      saleId: sale.id,
      reviewId: review.id,
    },
  );
  typia.assert(reviewDetail);
  // Validate rating range
  TestValidator.predicate(
    "rating between 1 and 5 inclusive",
    reviewDetail.rating >= 1 && reviewDetail.rating <= 5,
  );
  // Validate timestamps format (ISO 8601 date-time)
  for (const field of ["createdAt", "updatedAt", "deletedAt"] as const) {
    if (reviewDetail[field] !== null) {
      TestValidator.predicate(
        `reviewDetail.${field} is ISO date-time string`,
        typeof reviewDetail[field] === "string" &&
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(reviewDetail[field]!),
      );
    }
  }
  // Validate nested sale summary timestamps
  for (const field of ["createdAt", "updatedAt"] as const) {
    TestValidator.predicate(
      `sale.${field} is ISO date-time string`,
      typeof reviewDetail.sale[field] === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(reviewDetail.sale[field]),
    );
  }
  // Validate nested customer summary timestamps
  for (const field of ["createdAt", "updatedAt"] as const) {
    TestValidator.predicate(
      `customer.${field} is ISO date-time string`,
      typeof reviewDetail.customer[field] === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
          reviewDetail.customer[field],
        ),
    );
  }
  // 7. Attempt 404 error for invalid reviewId
  await TestValidator.error("404 for non-existent reviewId", async () => {
    await api.functional.shoppingMall.sales.reviews.at(sellerConnection, {
      saleId: sale.id,
      reviewId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // 8. Attempt 404 error for invalid saleId
  await TestValidator.error("404 for non-existent saleId", async () => {
    await api.functional.shoppingMall.sales.reviews.at(sellerConnection, {
      saleId: typia.random<string & tags.Format<"uuid">>(),
      reviewId: review.id,
    });
  });
}
