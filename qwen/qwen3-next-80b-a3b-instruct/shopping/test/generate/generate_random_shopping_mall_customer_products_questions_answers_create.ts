import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnswer";
import { prepare_random_shopping_mall_product_answer } from "../prepare/prepare_random_shopping_mall_product_answer";
export async function generate_random_shopping_mall_customer_products_questions_answers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductAnswer.ICreate>;
    params: {
      productId: string;
      questionId: string;
    };
  },
): Promise<IShoppingMallProductAnswer> {
  const prepared: IShoppingMallProductAnswer.ICreate =
    prepare_random_shopping_mall_product_answer(props.body);
  return await api.functional.shoppingMall.customer.products.questions.answers.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      questionId: props.params.questionId,
    },
  );
}
