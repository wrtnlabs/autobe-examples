import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_question_answer } from "../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function generate_random_shopping_mall_seller_sale_question_answers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleQuestionAnswer.ICreate>;
  },
): Promise<IShoppingMallSaleQuestionAnswer> {
  const prepared: IShoppingMallSaleQuestionAnswer.ICreate =
    prepare_random_shopping_mall_sale_question_answer(props.body);
  const result: IShoppingMallSaleQuestionAnswer =
    await api.functional.shoppingMall.seller.sale_question_answers.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
