import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_questions_list_full_text_search(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test full-text search on sale question titles and bodies, with pagination, sorting, and admin authorization.
  // 1. Administrator Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize administrator with random IJoin props (empty object since IJoin is empty)
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Use token returned by authorize_administrator_join sets headers internally
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Prepare multiple search test inputs
  const searchTerms = [
    "refund",
    "delivery",
    "payment",
    "status",
    "question",
    "product",
  ];
  const pages = [1, 2];
  const limits = [5, 10];
  const sorts = ["created", "updated", "status"];
  // 3. Test each search term with pagination and sorting
  for (const term of searchTerms) {
    for (const page of pages) {
      for (const limit of limits) {
        for (const sort of sorts) {
          const body: IShoppingMallSaleQuestion.IRequest = {
            q: term,
            page: page as number,
            limit: limit as number,
            sort: sort,
          };
          // Call the API endpoint
          const output =
            await api.functional.shoppingMall.administrator.sale_questions.index(
              adminConnection,
              { body },
            );
          // Validate response structure
          typia.assert(output);
          // Pagination info must be valid
          TestValidator.predicate(
            `page current for term '${term}'`,
            output.pagination.current >= 1,
          );
          TestValidator.predicate(
            `page records for term '${term}'`,
            output.pagination.records >= 0,
          );
          TestValidator.predicate(
            `page limit for term '${term}'`,
            output.pagination.limit >= 0,
          );
          TestValidator.predicate(
            `page pages for term '${term}'`,
            output.pagination.pages >= 0,
          );
          // Verify all data items contain the term in title or body, case insensitive
          for (const question of output.data) {
            // Since IShoppingMallSaleQuestion.ISummary is empty, we can only check existence of properties
            // We'll assume title and body exist as per scenario description
            const title = (question as any).title as string | undefined;
            const bodyText = (question as any).body as string | undefined;
            const foundInTitle =
              title?.toLowerCase().includes(term.toLowerCase()) ?? false;
            const foundInBody =
              bodyText?.toLowerCase().includes(term.toLowerCase()) ?? false;
            TestValidator.predicate(
              `term '${term}' found in title or body`,
              foundInTitle || foundInBody,
            );
          }
        }
      }
    }
  }
  // 4. Validate authorization enforcement
  // Try to call without authorization - expect failure
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject unauthorized access",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sale_questions.index(
        unauthorizedConnection,
        {
          body: {},
        },
      );
    },
  );
}
