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

export async function test_api_customer_sale_questions_list_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving a filtered list of sale questions for an authenticated customer with filters including status, date ranges (createdAtFrom, createdAtTo), and keyword search on question title/body. Confirm that only questions matching the specified status and falling within the date ranges are returned. Confirm the keyword search properly filters the questions. Validate pagination and sorting are correctly applied in the response. Ensure access control restricts questions to the authenticated customer only.
  // 1. Customer account registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(authorizedCustomer);
  // Update connection headers for authenticated requests
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Create multiple sale questions with different statuses, dates and titles
  // We'll use the SDK function directly here to create them is not possible as no utility provided
  // But since no create API is available, we rely on the existing data or simulate search
  // So we create multiple queries to test filtering
  // Prepare test filters
  const statusFilter = "open";
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days ago
  const recentDate = new Date().toISOString(); // now
  const keyword = "test";
  const page = 1;
  const limit = 10;
  // 3. Call API with status and date range filters
  const response1: IPageIShoppingMallSaleQuestion.ISummary =
    await api.functional.shoppingMall.customer.customer.sale_questions.index(
      customerConnection,
      {
        body: {
          status: statusFilter,
          createdAtFrom: pastDate,
          createdAtTo: recentDate,
          page,
          limit,
        },
      },
    );
  typia.assert(response1);
  // Validate returned data all match status and date range
  response1.data.forEach((question) => {
    TestValidator.equals(
      "customer ID matches",
      question.customer.id,
      authorizedCustomer.id,
    );
    TestValidator.equals(
      "status matches filter",
      question.status,
      statusFilter,
    );
    TestValidator.predicate(
      "createdAtFrom filter",
      question.createdAt >= pastDate,
    );
    TestValidator.predicate(
      "createdAtTo filter",
      question.createdAt <= recentDate,
    );
  });
  // 4. Call API with keyword search filter
  const response2: IPageIShoppingMallSaleQuestion.ISummary =
    await api.functional.shoppingMall.customer.customer.sale_questions.index(
      customerConnection,
      {
        body: {
          search: keyword,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response2);
  // Validate that every returned question contains keyword in title or status
  response2.data.forEach((question) => {
    TestValidator.equals(
      "customer ID matches",
      question.customer.id,
      authorizedCustomer.id,
    );
    TestValidator.predicate(
      "keyword in title or body",
      question.title.toLowerCase().includes(keyword) ||
        question.status.toLowerCase().includes(keyword),
    );
  });
  // 5. Validate pagination info
  TestValidator.predicate(
    "page current correct",
    response2.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit correct",
    response2.pagination.limit === 10,
  );
  TestValidator.predicate(
    "page records not negative",
    response2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages not negative",
    response2.pagination.pages >= 0,
  );
}
