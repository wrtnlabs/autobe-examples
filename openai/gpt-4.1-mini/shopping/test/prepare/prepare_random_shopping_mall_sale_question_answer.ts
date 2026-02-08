import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sale_question_answer(
  input?: DeepPartial<IShoppingMallSaleQuestionAnswer.ICreate> | undefined,
): IShoppingMallSaleQuestionAnswer.ICreate {
  input;
  return {};
}
