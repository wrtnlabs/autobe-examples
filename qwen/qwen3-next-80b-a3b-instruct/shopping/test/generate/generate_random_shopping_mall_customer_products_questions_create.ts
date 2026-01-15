import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductQuestion";
import { prepare_random_shopping_mall_product_question } from "../prepare/prepare_random_shopping_mall_product_question";
export async function generate_random_shopping_mall_customer_products_questions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductQuestion.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductQuestion> {
  const prepared: IShoppingMallProductQuestion.ICreate =
    prepare_random_shopping_mall_product_question(props.body);
  return await api.functional.shoppingMall.customer.products.questions.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
