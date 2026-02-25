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
import { generate_random_shopping_mall_customer_product_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_product_reviews_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_customer_product_review_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(customer);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(seller);
  // 3. Seller creates a sale entity
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 4. Customer creates a product review referencing the sale
  const rating = (typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() || 1) satisfies number as number;
  const body = {
    shoppingMallSaleId: sale.id,
    shoppingMallCustomerId: customer.id,
    rating,
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSaleReview.ICreate;
  const review =
    await generate_random_shopping_mall_customer_product_reviews_create(
      customerConnection,
      { body },
    );
  typia.assert(review);
  // 5. Validate review fields
  TestValidator.equals(
    "review.shoppingMallSaleId",
    review.shoppingMallSaleId,
    sale.id,
  );
  TestValidator.equals(
    "review.shoppingMallCustomerId",
    review.shoppingMallCustomerId,
    customer.id,
  );
  TestValidator.predicate(
    "review.rating between 1 and 5",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.equals("review.body", review.body, body.body);
  TestValidator.predicate(
    "review.createdAt ISO format",
    typeof review.createdAt === "string",
  );
  TestValidator.predicate(
    "review.updatedAt ISO format",
    typeof review.updatedAt === "string",
  );
  TestValidator.equals("review.sale.id", review.sale.id, sale.id);
  TestValidator.equals("review.customer.id", review.customer.id, customer.id);
}
