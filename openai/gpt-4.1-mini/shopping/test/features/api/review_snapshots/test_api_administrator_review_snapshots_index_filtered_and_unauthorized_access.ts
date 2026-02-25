import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_product_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_product_reviews_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_administrator_review_snapshots_index_filtered_and_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminJoinPayload: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  };
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  const adminAuthorized = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoinPayload.email,
      password: adminJoinPayload.password,
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Seller join and login
  const sellerJoinPayload: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    shopName: RandomGenerator.name(1),
    shopDescription: null,
    logoUri: null,
  };
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: sellerJoinPayload });
  const sellerAuthorized = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinPayload.email,
      password: sellerJoinPayload.password,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = sellerConnection.headers ?? {};
  sellerConnection.headers.Authorization = sellerAuthorized.token.access;
  // 3. Customer join and login
  const customerJoinPayload: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  };
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: customerJoinPayload,
  });
  const customerAuthorized = await authorize_customer_login(
    customerConnection,
    {
      body: {
        email: customerJoinPayload.email,
        password: customerJoinPayload.password,
      },
    },
  );
  typia.assert(customerAuthorized);
  customerConnection.headers = customerConnection.headers ?? {};
  customerConnection.headers.Authorization = customerAuthorized.token.access;
  // 4. Seller creates a sale product
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: { category_id: typia.random<string & tags.Format<"uuid">>() }, // category id random
    },
  );
  typia.assert(sale);
  // 5. Customer writes multiple product reviews with different ratings and body content
  const reviewBodies = [
    "Excellent product, really loved it.",
    "Good quality and fast shipping.",
    "Average experience, not bad.",
    "Poor packaging, disappointed.",
    "Terrible, do not buy!",
  ];
  const ratings = [5, 4, 3, 2, 1];
  const createdReviews: IShoppingMallSaleReview[] = [];
  for (let i = 0; i < ratings.length; i++) {
    const review =
      await generate_random_shopping_mall_customer_product_reviews_create(
        customerConnection,
        {
          body: {
            shoppingMallSaleId: sale.id,
            shoppingMallCustomerId: customerAuthorized.id,
            rating: ratings[i],
            body: reviewBodies[i],
          },
        },
      );
    typia.assert(review);
    createdReviews.push(review);
  }
  // Wait briefly to allow review snapshot creation (depending on backend async ops)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 6. Administrator queries review snapshots with rating filter (ratingMin=4, ratingMax=5) and body substring filter
  // Use substring within body string length range to avoid error
  const filterBody = reviewBodies[0].substring(
    3,
    Math.min(20, reviewBodies[0].length),
  );
  const filteredSnapshots =
    await api.functional.shoppingMall.administrator.reviewSnapshots.index(
      adminConnection,
      {
        body: {
          ratingMin: 4,
          ratingMax: 5,
          body: filterBody,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(filteredSnapshots);
  // Validate filtering correctness: all results must have rating between 4 and 5 and body containing filterBody string
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.predicate(
      `rating in range for snapshot id ${snapshot.id}`,
      snapshot.rating >= 4 && snapshot.rating <= 5,
    );
    if (snapshot.body?.includes(filterBody)) {
      TestValidator.predicate(
        `body contains filter text for snapshot id ${snapshot.id}`,
        true,
      );
    } else if (snapshot.body !== null && snapshot.body !== undefined) {
      TestValidator.predicate(
        `body contains filter text for snapshot id ${snapshot.id}`,
        false,
      );
    }
  }
  // 7. Attempt to access review snapshots without authentication
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "access without authentication should fail",
    401,
    async () =>
      await api.functional.shoppingMall.administrator.reviewSnapshots.index(
        anonymousConnection,
        { body: {} },
      ),
  );
  // 8. Seller tries to access review snapshots - accept 401 or 403 as possible response
  await TestValidator.httpError(
    "seller access should be denied",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.reviewSnapshots.index(
        sellerConnection,
        { body: {} },
      ),
  );
  // 9. Customer tries to access review snapshots - accept 401 or 403 as possible response
  await TestValidator.httpError(
    "customer access should be denied",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.reviewSnapshots.index(
        customerConnection,
        { body: {} },
      ),
  );
}
