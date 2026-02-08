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

export async function test_api_seller_sale_question_answer_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Actor-specific connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Register and login as customer
  const customerJoinBody: IShoppingMallCustomer.IJoin =
    typia.random<IShoppingMallCustomer.IJoin>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuthorized);
  // After join, customerConnection must have updated header with customer token
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 2. Register and login as seller
  const sellerJoinBody: Partial<IShoppingMallSeller.IJoin> = {};
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  // After join, sellerConnection must have updated header with seller token
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 3. As the customer actor, create a sale question
  const saleQuestionRaw =
    await generate_random_shopping_mall_customer_sale_questions_create_sale_question(
      customerConnection,
      { body: {} },
    );
  const saleQuestion: IShoppingMallSaleQuestion = typia.assert(saleQuestionRaw);

  // 4. As the seller actor, create a sale question answer linked to the question
  // Generate a valid uuid to simulate seller_id
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // Extract necessary properties safely with fallback to string literals as the original IShoppingMallSaleQuestion lacks 'id' and 'title' in type
  const questionId: string = (saleQuestion as any).id ?? typia.random<string & tags.Format<"uuid">>();
  const questionTitle: string = (saleQuestion as any).title ?? "your question";

  // Prepare title and body string constants
  const answerTitle = `Answer to: ${questionTitle}`;
  const answerBody = `Thank you for your question: ${questionTitle}. This is the seller's answer.`;

  const newAnswerBody: IShoppingMallSaleQuestionAnswer.ICreate = {
    shopping_mall_sale_question_id: questionId,
    seller_id: sellerId,
    title: answerTitle,
    body: answerBody,
  };

  const createdAnswerRaw =
    await generate_random_shopping_mall_seller_sale_question_answers_create(
      sellerConnection,
      {
        body: newAnswerBody,
      },
    );
  const createdAnswer: IShoppingMallSaleQuestionAnswer = typia.assert(
    createdAnswerRaw,
  );

  // Validate the created answer fields
  // Use safe extraction from any for properties that do not exist in interface
  const createdAnswerId: string = (createdAnswer as any).id ?? "";
  TestValidator.predicate(
    "created answer id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdAnswerId,
    ),
  );

  const createdAnswerQuestionId: string = (createdAnswer as any).shopping_mall_sale_question_id ?? "";
  const createdAnswerTitle: string = (createdAnswer as any).title ?? "";
  const createdAnswerBodyText: string = (createdAnswer as any).body ?? "";
  const createdAnswerSellerId: string = (createdAnswer as any).seller_id ?? "";
  
  TestValidator.equals("answer question id matches", createdAnswerQuestionId, questionId);
  TestValidator.equals("answer title matches", createdAnswerTitle, answerTitle);
  TestValidator.equals("answer body matches", createdAnswerBodyText, answerBody);

  TestValidator.predicate(
    "seller_id exists",
    typeof createdAnswerSellerId === "string" && createdAnswerSellerId.length > 0,
  );

  const createdAt: string = (createdAnswer as any).created_at ?? "";
  const updatedAt: string = (createdAnswer as any).updated_at ?? "";
  TestValidator.predicate(
    "created_at is ISO string",
    typeof createdAt === "string" && !isNaN(Date.parse(createdAt)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof updatedAt === "string" && !isNaN(Date.parse(updatedAt)),
  );

  const deletedAt: null = (createdAnswer as any).deleted_at ?? null;
  TestValidator.equals("deleted_at is null", deletedAt, null);
}
