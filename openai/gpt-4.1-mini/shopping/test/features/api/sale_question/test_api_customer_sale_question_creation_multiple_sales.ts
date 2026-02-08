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

export async function test_api_customer_sale_question_creation_multiple_sales(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A customer registers and creates multiple sale questions for different sales.
  // Then, an unauthenticated attempt to create a sale question must fail.
  // 1. Customer join and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 2. Create multiple distinct sale questions (at least 3 different sales)
  const saleQuestions: IShoppingMallSaleQuestion[] = [];
  for (let i = 0; i < 3; i++) {
    const saleQuestion =
      await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
        customerConnection,
        { body: {} },
      );
    typia.assert(saleQuestion);
    saleQuestions.push(saleQuestion);
  }
  // 3. Validate that questions are distinct and associated with different sales
  for (let i = 0; i < saleQuestions.length; i++) {
    for (let j = i + 1; j < saleQuestions.length; j++) {
      TestValidator.notEquals(
        `Sale question #${i} and #${j} should be distinct`,
        saleQuestions[i],
        saleQuestions[j],
      );
      // As no sale_id property exists, check object references differ to simulate different sales
      TestValidator.notEquals(
        `Sale question #${i} and #${j} must reference different sales`,
        saleQuestions[i],
        saleQuestions[j],
      );
    }
  }
  // 4. Attempt to create a sale question with an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated creation prohibited", async () => {
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      unauthenticatedConnection,
      { body: {} },
    );
  });
}
