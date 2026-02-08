import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_question } from "../prepare/prepare_random_shopping_mall_sale_question";

export async function generate_random_shopping_mall_customer_sale_questions_create_sale_question(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleQuestion.ICreate> | undefined;
  },
): Promise<IShoppingMallSaleQuestion> {
  const prepared: IShoppingMallSaleQuestion.ICreate =
    prepare_random_shopping_mall_sale_question(props.body);
  const result: IShoppingMallSaleQuestion =
    await api.functional.shoppingMall.customer.sale_questions.createSaleQuestion(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
