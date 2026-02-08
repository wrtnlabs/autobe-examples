import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_questions_index(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve a paginated list of customer's own sale questions without filters.
  // 1. Authenticate as a new customer by joining the platform.
  const customerConnection1: api.IConnection = { host: connection.host };
  const joinBody1: IShoppingMallCustomer.IJoin = {
    email: `test_customer1_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized1 = await authorize_customer_join(customerConnection1, {
    body: joinBody1,
  });
  customerConnection1.headers = { Authorization: authorized1.token.access };
  // 2. Query sale questions without any filter (empty body) since no parameters are defined in IRequest.
  const req1 = {};
  const response1 =
    await api.functional.shoppingMall.customer.sale_questions.index(
      customerConnection1,
      { body: req1 },
    );
  typia.assert(response1);
  // 3. Validate the response includes pagination info and an array of objects.
  TestValidator.predicate(
    "pagination exists",
    response1.pagination !== null && response1.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(response1.data));
  // Scenario 2: Retrieve filtered sale questions by sale ID and question status.
  // Given there is no way to filter, just repeat the call and validate structure.
  const customerConnection2: api.IConnection = { host: connection.host };
  const joinBody2: IShoppingMallCustomer.IJoin = {
    email: `test_customer2_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized2 = await authorize_customer_join(customerConnection2, {
    body: joinBody2,
  });
  customerConnection2.headers = { Authorization: authorized2.token.access };
  const req2 = {};
  const response2 =
    await api.functional.shoppingMall.customer.sale_questions.index(
      customerConnection2,
      { body: req2 },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "pagination exists",
    response2.pagination !== null && response2.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(response2.data));
  // Scenario 3: Retrieve sale questions with full-text search on title or body.
  // Again, send empty body due to schema definition.
  const customerConnection3: api.IConnection = { host: connection.host };
  const joinBody3: IShoppingMallCustomer.IJoin = {
    email: `test_customer3_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized3 = await authorize_customer_join(customerConnection3, {
    body: joinBody3,
  });
  customerConnection3.headers = { Authorization: authorized3.token.access };
  const req3 = {};
  const response3 =
    await api.functional.shoppingMall.customer.sale_questions.index(
      customerConnection3,
      { body: req3 },
    );
  typia.assert(response3);
  TestValidator.predicate(
    "pagination exists",
    response3.pagination !== null && response3.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(response3.data));
}
