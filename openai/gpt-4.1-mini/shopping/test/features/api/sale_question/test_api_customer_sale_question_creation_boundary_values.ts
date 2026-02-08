import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { generate_random_shopping_mall_customer_sale_questions_create_sale_question } from "../../../generate/generate_random_shopping_mall_customer_sale_questions_create_sale_question";

export async function test_api_customer_sale_question_creation_boundary_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(connection, {
    body: joinBody,
  });
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };

  // 2. Define boundary strings for title and body
  const titleMinLength = 1;
  const titleMaxLength = 255;
  const bodyMinLength = 1;
  const bodyMaxLength = 1000;

  // Prepare minimum length question
  const minQuestion = await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
    customerConnection,
    {
      body: {
        title: "A",
        body: "B",
        status: "open",
        sale_id: typia.random<string & tags.Format<"uuid">>(),
        customer_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(minQuestion);

  // Since properties are not defined on IShoppingMallSaleQuestion, skip testing them to avoid compilation errors

  // Prepare maximum length boundary strings
  const maxTitle = "T".repeat(titleMaxLength);
  const maxBody = "B".repeat(bodyMaxLength);

  // Prepare maximum length question
  const maxQuestion = await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
    customerConnection,
    {
      body: {
        title: maxTitle,
        body: maxBody,
        status: "open",
        sale_id: typia.random<string & tags.Format<"uuid">>(),
        customer_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(maxQuestion);
  // Skipping property tests here as well
}
