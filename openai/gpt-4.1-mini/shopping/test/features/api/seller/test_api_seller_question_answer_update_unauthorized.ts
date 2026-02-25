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

export async function test_api_seller_question_answer_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Seller A joins and logs in
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoinOutput = await authorize_seller_join(sellerAConnection, { body: {} });
  typia.assert(sellerAJoinOutput);
  // Seller A creates a product (required for sale creation)
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {},
    },
  );
  typia.assert(productA);
  // Seller A creates a sale
  const saleA = await generate_random_shopping_mall_seller_sales_create(
    sellerAConnection,
    {
      body: { category_id: productA.productSubcategory.category.id },
    },
  );
  typia.assert(saleA);
  // Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinOutput = await authorize_customer_join(
    customerConnection,
    { body: {} },
  );
  typia.assert(customerJoinOutput);
  // Customer creates a question on seller A's sale
  const question =
    await generate_random_shopping_mall_customer_sales_questions_create_question(
      customerConnection,
      {
        params: { saleId: saleA.id },
      },
    );
  typia.assert(question);
  // Seller A creates an answer to the question
  const answer =
    await generate_random_shopping_mall_seller_sales_question_answers_create_answer(
      sellerAConnection,
      {
        params: { saleId: saleA.id },
        body: { shopping_mall_sale_question_id: question.id },
      },
    );
  typia.assert(answer);
  // Seller B joins and logs in
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoinOutput = await authorize_seller_join(sellerBConnection, { body: {} });
  typia.assert(sellerBJoinOutput);
  // Seller B attempts to update Seller A's answer
  const updateBody: IShoppingMallSaleQuestionAnswer.IUpdate = {
    title: "Updated Title Unauthorized",
    body: "Updated Body Unauthorized",
  };
  await TestValidator.httpError(
    "seller B should not be able to update seller A's answer",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.question_answers.updateQuestionAnswer(
        sellerBConnection,
        {
          saleId: saleA.id,
          answerId: answer.id,
          body: updateBody,
        },
      );
    },
  );
}
