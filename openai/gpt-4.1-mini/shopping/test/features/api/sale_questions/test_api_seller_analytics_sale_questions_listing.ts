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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_analytics_sale_questions_listing(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of paginated customer sale questions for analytics by an authorized seller.
  // The seller must have created at least one sale before querying questions.
  // The request includes filters for question status, creation date range, and a search keyword in the question title or body.
  // Check that only non-deleted questions related to the seller's sales are returned.
  // Verify pagination metadata and question summary fields including customer and sale details.
  // Confirm authorization as a seller and no unauthorized access occurs.
  // 1. Seller joins and gets authorized
  const sellerJoinConn: api.IConnection = { host: connection.host };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerJoinConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(),
        shopDescription: null,
        logoUri: null,
      },
    });
  sellerJoinConn.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Seller creates a sale listing (required for having sale questions)
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerJoinConn,
    { body: {} },
  );
  typia.assert(sale);
  // 3. Prepare query data for sale questions
  // Use date ranges around current date for createdAtFrom and createdAtTo
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 3600 * 24 * 7,
  ).toISOString(); // 7 days ago
  const createdAtTo = now.toISOString();
  const searchKeyword = RandomGenerator.substring(
    `Sale question about ${sale.name}: detailed inquiry`,
  );
  const requestBody: IShoppingMallSaleQuestion.IRequest = {
    status: "open",
    createdAtFrom: createdAtFrom,
    createdAtTo: createdAtTo,
    search: searchKeyword,
    page: 1,
    limit: 10,
  };
  // 4. Seller queries sale questions for analytics
  const result: IPageIShoppingMallSaleQuestion.ISummary =
    await api.functional.shoppingMall.seller.analytics.sale_questions.index(
      sellerJoinConn,
      { body: requestBody },
    );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit equals 10",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 6. Validate that all questions are non-deleted, belongs to seller's sale, and match filters
  for (const question of result.data) {
    typia.assert(question);
    TestValidator.predicate(
      "question is not deleted",
      question.deletedAt === null,
    );
    TestValidator.equals(
      "question status matches filter",
      question.status,
      requestBody.status,
    );
    // Check createdAt between createdAtFrom and createdAtTo
    TestValidator.predicate(
      "question createdAt in range",
      question.createdAt >= createdAtFrom && question.createdAt <= createdAtTo,
    );
    // Check question title or body contains the search keyword (since keyword is used for trigram similarity search, we check at least title contains it)
    TestValidator.predicate(
      "question title contains search keyword",
      question.title.includes(searchKeyword),
    );
    // Check question sale belongs to seller
    TestValidator.equals(
      "sale belongs to authorized seller",
      question.sale.seller.id,
      sellerAuthorized.id,
    );
  }
}
