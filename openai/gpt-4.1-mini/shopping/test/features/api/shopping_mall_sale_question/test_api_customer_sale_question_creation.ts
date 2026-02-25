import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_customer_sales_questions_create_question } from "../../../generate/generate_random_shopping_mall_customer_sales_questions_create_question";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";

export async function test_api_customer_sale_question_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinOutput = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerJoinOutput);
  customerConnection.headers = {
    Authorization: customerJoinOutput.token.access,
  };
  // 2. Register and authorize a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerJoinOutput);
  sellerConnection.headers = { Authorization: sellerJoinOutput.token.access };
  // 3. Seller creates a sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(sale);
  // 4. Customer creates a question on the sale
  const questionBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSaleQuestion.ICreate;
  const question =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerConnection,
      {
        params: { saleId: sale.id },
        body: questionBody,
      },
    );
  typia.assert(question);
  // 5. Validate the question details
  TestValidator.equals("question status", question.status, "open");
  TestValidator.equals("question sale id", question.sale.id, sale.id);
  TestValidator.equals(
    "question customer id",
    question.customer.id,
    customerJoinOutput.id,
  );
  TestValidator.equals("question title", question.title, questionBody.title);
  TestValidator.equals("question body", question.body, questionBody.body);
  // 6. Scenario: create question without customer auth - expect 401 Unauthorized
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized question create",
    401,
    async () => {
      await api.functional.shoppingMall.customer.sales.questions.createQuestion(
        anonymousConnection,
        {
          saleId: sale.id,
          body: questionBody,
        },
      );
    },
  );
  // 7. Scenario: create question for non-existent sale - expect 404 Not Found
  const invalidSaleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "question create with invalid saleId",
    404,
    async () => {
      await generate_random_shopping_mall_customer_sales_questions_create_question(
        customerConnection,
        {
          params: { saleId: invalidSaleId },
          body: questionBody,
        },
      );
    },
  );
}
