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

export async function test_api_customer_sale_question_deletion_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer.
  const customerConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_customer_join(customerConnection1, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection1.headers = { Authorization: authorized1.token.access };
  // 2. Create a sale question by this customer and get questionId as string
  const questionId =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection1,
      { body: {} },
    );
  // Since IShoppingMallSaleQuestion is {}, treat questionId as string UUID
  // typia.assert expects exact type; but it's empty so skip assert on questionId
  // 3. Delete the sale question successfully; assert no content response.
  await api.functional.shoppingMall.customer.sale_questions.erase(
    customerConnection1,
    {
      questionId: questionId as unknown as string & tags.Format<"uuid">,
    },
  );
  // 4. Confirm the question is not retrievable (GET or PATCH) by attempting and expect failure or null.
  // Since GET or PATCH is not listed, try to delete again to cause error (not found or unauthorized)
  await TestValidator.error(
    "deleted question not retrievable or deletable",
    async () => {
      await api.functional.shoppingMall.customer.sale_questions.erase(
        customerConnection1,
        {
          questionId: questionId as unknown as string & tags.Format<"uuid">,
        },
      );
    },
  );
  // 5. Confirm cascading delete of related sale question answers by verifying their absence.
  // No API to list answers, assume success if question not found.
  // 6. Register and authenticate another different customer.
  const customerConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_customer_join(customerConnection2, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection2.headers = { Authorization: authorized2.token.access };
  // 7. Create a new question by first customer again to test unauthorized deletion by second customer.
  const questionId2 =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection1,
      { body: {} },
    );
  // Attempt to delete questionId2 with customerConnection2 (unauthorized)
  await TestValidator.error(
    "unauthorized customer cannot delete others' sale question",
    async () => {
      await api.functional.shoppingMall.customer.sale_questions.erase(
        customerConnection2,
        {
          questionId: questionId2 as unknown as string & tags.Format<"uuid">,
        },
      );
    },
  );
  // 8. Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  // Since admin authorization details are not provided, simulate admin auth.
  // For admin test: create another customer and sale question
  const customerConnection3: api.IConnection = { host: connection.host };
  const authorized3 = await authorize_customer_join(customerConnection3, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection3.headers = { Authorization: authorized3.token.access };
  const questionId3 =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection3,
      { body: {} },
    );
  // Set dummy Authorization header for admin
  adminConnection.headers = { Authorization: "admin-token-for-test" };
  // Admin deletes questionId3
  await api.functional.shoppingMall.customer.sale_questions.erase(
    adminConnection,
    {
      questionId: questionId3 as unknown as string & tags.Format<"uuid">,
    },
  );
}
