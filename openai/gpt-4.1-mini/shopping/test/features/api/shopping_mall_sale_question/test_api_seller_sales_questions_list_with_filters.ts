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

export async function test_api_seller_sales_questions_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd!",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Set authorization header for sellerConnection
  sellerConnection.headers = {
    Authorization: sellerJoin.token.access,
  };
  // 2. Prepare request filters
  // We pick filter values to test various filter conditions
  const statusFilter = "open"; // example status
  const createdAtFrom = new Date();
  createdAtFrom.setMonth(createdAtFrom.getMonth() - 6); // 6 months ago
  const createdAtTo = new Date();
  const createdAtFromStr = createdAtFrom.toISOString() as string &
    tags.Format<"date-time">;
  const createdAtToStr = createdAtTo.toISOString() as string &
    tags.Format<"date-time">;
  // Partial keyword from the name of the shop (simulate search keyword)
  const searchKeyword = RandomGenerator.substring(sellerJoin.shopName);
  // 3. Compose request body with pagination and filters
  const requestBody: IShoppingMallSaleQuestion.IRequest = {
    status: statusFilter,
    createdAtFrom: createdAtFromStr,
    createdAtTo: createdAtToStr,
    search: searchKeyword,
    page: 1,
    limit: 10,
  };
  // 4. Call the API to get filtered sale questions
  const questionList =
    await api.functional.shoppingMall.seller.sales.questions.index(
      sellerConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(questionList);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    questionList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit count",
    questionList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages count",
    questionList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count",
    questionList.pagination.records >= 0,
  );
  // 6. Validate each question entry matches filter criteria and relations
  for (const question of questionList.data) {
    typia.assert(question);
    // Status matches filter (if filter is specified)
    if (requestBody.status !== undefined) {
      TestValidator.equals(
        "question status matches filter",
        question.status,
        requestBody.status,
      );
    }
    // CreatedAt is within the filter range
    if (
      requestBody.createdAtFrom !== null &&
      requestBody.createdAtFrom !== undefined
    ) {
      TestValidator.predicate(
        "question createdAt after createdAtFrom",
        new Date(question.createdAt) >= new Date(requestBody.createdAtFrom),
      );
    }
    if (
      requestBody.createdAtTo !== null &&
      requestBody.createdAtTo !== undefined
    ) {
      TestValidator.predicate(
        "question createdAt before createdAtTo",
        new Date(question.createdAt) <= new Date(requestBody.createdAtTo),
      );
    }
    // Search keyword presence in title or sale name or customer email
    if (requestBody.search !== undefined) {
      const keyword = requestBody.search.toLowerCase();
      const foundInTitle = question.title.toLowerCase().includes(keyword);
      const foundInSaleName = question.sale.name
        .toLowerCase()
        .includes(keyword);
      const foundInCustomerEmail = question.customer.email
        .toLowerCase()
        .includes(keyword);
      TestValidator.predicate(
        "question contains search keyword",
        foundInTitle || foundInSaleName || foundInCustomerEmail,
      );
    }
    // Related sale and customer summary information present
    TestValidator.predicate(
      "question has related sale info",
      question.sale !== null && typeof question.sale === "object",
    );
    TestValidator.predicate(
      "question has related customer info",
      question.customer !== null && typeof question.customer === "object",
    );
  }
}
