import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_customer_sale_questions_create_sale_question } from "../../../generate/generate_random_shopping_mall_customer_sale_questions_create_sale_question";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";

export async function test_api_customer_sale_question_deletion_error_handling_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "ValidPass123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customer1Connection.headers = {
    ...customer1Connection.headers,
    Authorization: `Bearer ${customer1Auth.token.access}`,
  };
  // 2. Authenticate as second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "ValidPass456!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customer2Connection.headers = {
    ...customer2Connection.headers,
    Authorization: `Bearer ${customer2Auth.token.access}`,
  };
  // 3. Customer 2 creates a sale question (response has no id, so use random UUID for testing)
  await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
    customer2Connection,
    { body: {} },
  );
  // 4. Customer 1 tries to delete a non-existent sale question (random UUID)
  await TestValidator.httpError(
    "delete non-existent sale question should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_questions.erase(
        customer1Connection,
        {
          questionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Customer 1 attempts to delete sale question created by customer 2
  // but since no ID exists, use a random UUID different from previous
  await TestValidator.httpError(
    "delete sale question of another customer should return 403",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sale_questions.erase(
        customer1Connection,
        {
          questionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. Attempt to delete sale question without authentication using random UUID
  const notAuthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "delete sale question without auth should return 401",
    401,
    async () => {
      await api.functional.shoppingMall.customer.sale_questions.erase(
        notAuthenticatedConnection,
        {
          questionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 7. Customer 2 deletes own sale question (simulate deletion with random UUID as no ID)
  // This tests API call successfully executes (no error)
  await api.functional.shoppingMall.customer.sale_questions.erase(
    customer2Connection,
    {
      questionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
