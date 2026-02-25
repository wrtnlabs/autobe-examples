import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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
import { generate_random_shopping_mall_customer_sales_questions_create_question } from "../../../generate/generate_random_shopping_mall_customer_sales_questions_create_question";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_question_answers_create_answer } from "../../../generate/generate_random_shopping_mall_seller_sales_question_answers_create_answer";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_question } from "../../../prepare/prepare_random_shopping_mall_sale_question";
import { prepare_random_shopping_mall_sale_question_answer } from "../../../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function test_api_seller_question_answer_update_successful(
  connection: api.IConnection,
): Promise<void> {
  /*
   * Test updating a seller's answer to a customer question on their sale item.
   *
   * 1. Seller joins and logs in.
   * 2. Seller creates a product.
   * 3. Seller creates a sale linked to the product.
   * 4. Customer joins and logs in.
   * 5. Customer creates a question on the sale.
   * 6. Seller creates an answer to the question.
   * 7. Seller updates the answer with new title and body.
   * 8. Validate updated answer is correctly returned.
   */
  // Step 1: Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  // Step 2: Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // Step 3: Seller creates sale linked to product category
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: product.productSubcategory.category.id,
        name: product.name,
        description: product.description,
        base_price: product.basePrice,
      },
    },
  );
  // Step 4: Customer join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Step 5: Customer creates question on the sale
  const question =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerConnection,
      {
        params: { saleId: sale.id },
      },
    );
  // Step 6: Seller creates answer to the question
  const answer =
    await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: { shopping_mall_sale_question_id: question.id },
      },
    );
  // Step 7: Seller updates the answer
  const newTitle = RandomGenerator.name();
  const newBody = RandomGenerator.paragraph({ sentences: 3 });
  const updatedAnswer =
    await api.functional.shoppingMall.seller.sales.question_answers.updateQuestionAnswer(
      sellerConnection,
      {
        saleId: sale.id,
        answerId: answer.id,
        body: {
          title: newTitle,
          body: newBody,
        },
      },
    );
  typia.assert(updatedAnswer);
  // Step 8: Validate updated answer
  TestValidator.equals("updated answer id", updatedAnswer.id, answer.id);
  TestValidator.equals("updated answer title", updatedAnswer.title, newTitle);
  TestValidator.equals("updated answer body", updatedAnswer.body, newBody);
  TestValidator.predicate(
    "updated answer updatedAt timestamp",
    new Date(updatedAnswer.updatedAt).getTime() >=
      new Date(answer.updatedAt).getTime(),
  );
  TestValidator.equals(
    "updated answer shoppingMallSaleQuestionId",
    updatedAnswer.shoppingMallSaleQuestionId,
    question.id,
  );
  TestValidator.equals(
    "updated answer seller id",
    updatedAnswer.sellerId,
    seller.id,
  );
  TestValidator.predicate(
    "updated answer createdAt before updatedAt",
    new Date(updatedAnswer.createdAt).getTime() <=
      new Date(updatedAnswer.updatedAt).getTime(),
  );
}
