import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnswer";
import type { IShoppingMallProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import { prepare_random_shopping_mall_product_question } from "../../../prepare/prepare_random_shopping_mall_product_question";
import { prepare_random_shopping_mall_product_answer } from "../../../prepare/prepare_random_shopping_mall_product_answer";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_customer_products_questions_create } from "../../../generate/generate_random_shopping_mall_customer_products_questions_create";
import { generate_random_shopping_mall_customer_products_questions_answers_create } from "../../../generate/generate_random_shopping_mall_customer_products_questions_answers_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_answer_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    },
  });
  typia.assert(seller);
  // Step 2: Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    },
  });
  typia.assert(customer);
  // Step 3: Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 15,
          wordMin: 3,
          wordMax: 8,
        }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        price: typia.random<
          number & tags.Minimum<0.01> & tags.Maximum<10000>
        >(),
        sku: RandomGenerator.alphaNumeric(8),
        images: [
          typia.random<string & tags.Format<"uri">>(),
          typia.random<string & tags.Format<"uri">>(),
        ],
      },
    },
  );
  typia.assert(product);
  // Step 4: Customer creates a product question
  const question =
    await generate_random_shopping_mall_customer_products_questions_create(
      customerConnection,
      {
        params: { productId: product.id },
        body: {
          question: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 30,
          }),
        },
      },
    );
  typia.assert(question);
  // Step 5: Customer creates a product answer (approved by moderator)
  const answer =
    await generate_random_shopping_mall_customer_products_questions_answers_create(
      customerConnection,
      {
        params: { productId: product.id, questionId: question.id },
        body: {
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(answer);
  // Step 6: Verify answer status is approved
  TestValidator.equals("answer should be approved", answer.is_approved, true);
  TestValidator.equals(
    "answer status should be approved",
    answer.answer_status,
    "approved",
  );
  // Step 7: Create unauthenticated guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 8: Retrieve the product answer as a guest (unauthenticated)
  const retrievedAnswer =
    await api.functional.shoppingMall.products.questions.answers.at(
      guestConnection,
      {
        productId: product.id,
        questionId: question.id,
        answerId: answer.id,
      },
    );
  typia.assert(retrievedAnswer);
  // Step 9: Validate that the retrieved answer matches the original
  TestValidator.equals(
    "retrieved answer ID matches",
    retrievedAnswer.id,
    answer.id,
  );
  TestValidator.equals(
    "retrieved answer content matches",
    retrievedAnswer.content,
    answer.content,
  );
  TestValidator.equals(
    "retrieved answer is approved",
    retrievedAnswer.is_approved,
    true,
  );
  TestValidator.equals(
    "retrieved answer status is approved",
    retrievedAnswer.answer_status,
    "approved",
  );
}