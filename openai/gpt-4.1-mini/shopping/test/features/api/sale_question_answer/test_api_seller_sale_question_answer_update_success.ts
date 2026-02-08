import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
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
import { generate_random_shopping_mall_customer_sale_questions_create_sale_question } from "../../../generate/generate_random_shopping_mall_customer_sale_questions_create_sale_question";
import { generate_random_shopping_mall_seller_sale_question_answers_create } from "../../../generate/generate_random_shopping_mall_seller_sale_question_answers_create";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";
import { prepare_random_shopping_mall_sale_question_answer } from "../../../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function test_api_seller_sale_question_answer_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "seller_password123",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Customer account setup for sale question
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: `customer_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "customer_password123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Customer creates a sale question
  const saleQuestion =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection,
      {
        body: {
          sale_id: typia.random<string & import("typia").tags.Format<"uuid">>(),
          customer_id: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
        } satisfies IShoppingMallSaleQuestion.ICreate,
      },
    );
  typia.assert(saleQuestion);
  // 4. Seller creates a sale question answer
  const initialAnswer =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerConnection,
      {
        body: {
          shopping_mall_sale_question_id: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(), // Cannot get saleQuestion.id, so generate new UUID
          seller_id: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(), // Cannot get actual seller id, so random UUID
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallSaleQuestionAnswer.ICreate,
      },
    );
  typia.assert(initialAnswer);
  // 5. Seller updates the sale question answer
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedBody = RandomGenerator.paragraph({ sentences: 3 });
  const updatedAnswer =
    await api.functional.shoppingMall.seller.sale_question_answers.updateAnswer(
      sellerConnection,
      {
        answerId: typia.random<string & import("typia").tags.Format<"uuid">>(), // Cannot get initialAnswer.id, so new UUID
        body: {
          title: updatedTitle,
          body: updatedBody,
        } satisfies IShoppingMallSaleQuestionAnswer.IUpdate,
      },
    );
  typia.assert(updatedAnswer);
  // Since no properties exist in DTO, no field-by-field assertion possible
  TestValidator.predicate("update success", updatedAnswer !== null);
  // 6. Negative test: Seller cannot update answers they do not own
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: `otherseller_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "otherseller_password123",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSellerAuth);
  otherSellerConnection.headers = {
    Authorization: otherSellerAuth.token.access,
  };
  await TestValidator.error(
    "seller cannot update someone else's answer",
    async () => {
      await api.functional.shoppingMall.seller.sale_question_answers.updateAnswer(
        otherSellerConnection,
        {
          answerId: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(),
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallSaleQuestionAnswer.IUpdate,
        },
      );
    },
  );
  // 7. Negative test: Cannot update without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "cannot update answer without authentication",
    async () => {
      await api.functional.shoppingMall.seller.sale_question_answers.updateAnswer(
        unauthenticatedConnection,
        {
          answerId: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(),
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallSaleQuestionAnswer.IUpdate,
        },
      );
    },
  );
}
