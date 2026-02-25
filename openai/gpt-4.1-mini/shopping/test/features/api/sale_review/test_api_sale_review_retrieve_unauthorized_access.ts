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

export async function test_api_sale_review_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Seller creates a sale
  const sellerAuthedConnection: api.IConnection = { host: connection.host };
  sellerAuthedConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerAuthedConnection,
    {},
  );
  typia.assert(sale);
  // 3. Customer joins and authorized
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    { body: {} },
  );
  // 4. Customer creates a review for the sale
  const customerAuthedConnection: api.IConnection = { host: connection.host };
  customerAuthedConnection.headers = {
    Authorization: `Bearer ${customerAuthorized.token.access}`,
  };
  const review =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      customerAuthedConnection,
      {
        params: { saleId: sale.id },
      },
    );
  typia.assert(review);
  // 5. Attempt to access review without any auth (anonymous)
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized access without token should fail",
    401,
    async () =>
      await api.functional.shoppingMall.sales.reviews.at(anonymousConnection, {
        saleId: sale.id,
        reviewId: review.id,
      }),
  );
  // 6. Other customer joins
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerAuthorized = await authorize_customer_join(
    otherCustomerConnection,
    { body: {} },
  );
  // 7. Attempt to access review with other customer's auth
  const otherCustomerAuthedConnection: api.IConnection = {
    host: connection.host,
  };
  otherCustomerAuthedConnection.headers = {
    Authorization: `Bearer ${otherCustomerAuthorized.token.access}`,
  };
  await TestValidator.httpError(
    "Unauthorized access with different customer should fail",
    403,
    async () =>
      await api.functional.shoppingMall.sales.reviews.at(
        otherCustomerAuthedConnection,
        {
          saleId: sale.id,
          reviewId: review.id,
        },
      ),
  );
}
