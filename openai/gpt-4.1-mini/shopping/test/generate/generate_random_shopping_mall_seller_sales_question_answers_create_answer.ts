import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_question_answer } from "../prepare/prepare_random_shopping_mall_sale_question_answer";

export async function generate_random_shopping_mall_seller_sales_question_answers_create_answer(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleQuestionAnswer.ICreate> | undefined;
    params: {
      saleId: string;
    };
  },
): Promise<IShoppingMallSaleQuestionAnswer> {
  const prepared: IShoppingMallSaleQuestionAnswer.ICreate =
    prepare_random_shopping_mall_sale_question_answer(props.body);
  const result: IShoppingMallSaleQuestionAnswer =
    await api.functional.shoppingMall.seller.sales.question_answers.createAnswer(
      connection,
      {
        saleId: props.params.saleId,
        body: prepared,
      },
    );
  return result;
}
