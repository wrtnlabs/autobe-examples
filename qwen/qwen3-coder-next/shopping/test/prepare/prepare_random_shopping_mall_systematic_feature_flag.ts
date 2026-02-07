import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_systematic_feature_flag(
  input?: DeepPartial<IShoppingMallSystematicFeatureFlag.ICreate> | undefined,
): IShoppingMallSystematicFeatureFlag.ICreate {
  input;
  return {};
}
