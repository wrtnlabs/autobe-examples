import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_question } from "../prepare/prepare_random_shopping_mall_sale_question";

export async function generate_random_shopping_mall_customer_sales_questions_create_question(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleQuestion.ICreate> | undefined;
    params: {
      saleId: string;
    };
  },
): Promise<IShoppingMallSaleQuestion> {
  const prepared: IShoppingMallSaleQuestion.ICreate =
    prepare_random_shopping_mall_sale_question(props.body);
  const result: IShoppingMallSaleQuestion =
    await api.functional.shoppingMall.customer.sales.questions.createQuestion(
      connection,
      {
        saleId: props.params.saleId,
        body: prepared,
      },
    );
  return result;
}
