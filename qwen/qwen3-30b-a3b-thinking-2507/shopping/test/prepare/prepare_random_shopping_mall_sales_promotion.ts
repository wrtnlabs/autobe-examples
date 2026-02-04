import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSalesPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sales_promotion(
  input?: DeepPartial<IShoppingMallSalesPromotion.ICreate>,
): IShoppingMallSalesPromotion.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    start_date:
      input?.start_date ?? new Date(Date.now() + 86400000).toISOString(),
    end_date:
      input?.end_date ?? new Date(Date.now() + 86400000 * 8).toISOString(),
  };
}
