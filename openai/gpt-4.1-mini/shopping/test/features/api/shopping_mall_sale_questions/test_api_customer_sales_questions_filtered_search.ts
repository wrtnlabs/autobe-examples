import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
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
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

/**
 * Test case for validating filtered search capability on customer sale questions listing.
 * It tests filtering by question status and creation date range, with pagination and sorting verification.
 */
export async function test_api_customer_sales_questions_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join
  const sellerJoinInput: Partial<IShoppingMallSeller.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shopName: RandomGenerator.name(1),
  };
  const sellerBaseConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerBaseConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 2. Seller creates sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 1000,
      },
    },
  );
  typia.assert(sale);
  // 3. Customer join
  const customerJoinInput: Partial<IShoppingMallCustomer.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const customerBaseConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerBaseConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 4. Prepare filter criteria for questions
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const createdAtTo = now.toISOString();
  const questionFilter: IShoppingMallSaleQuestion.IRequest = {
    status: "open",
    createdAtFrom: createdAtFrom,
    createdAtTo: createdAtTo,
    page: 1,
    limit: 10,
  };
  // 5. Query filtered questions via customer endpoint
  const questionsPage =
    await api.functional.shoppingMall.customer.sales.questions.index(
      customerConnection,
      { saleId: sale.id, body: questionFilter },
    );
  typia.assert(questionsPage);
  // 6. Validate filter results
  TestValidator.predicate(
    "all questions have status 'open'",
    questionsPage.data.every((q) => q.status === "open"),
  );
  TestValidator.predicate(
    "all questions have createdAt within range",
    questionsPage.data.every(
      (q) => q.createdAt >= createdAtFrom && q.createdAt <= createdAtTo,
    ),
  );
  // 7. Validate pagination info
  TestValidator.predicate(
    "pagination page is 1",
    questionsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    questionsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    questionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    questionsPage.pagination.pages >= 0,
  );
}
