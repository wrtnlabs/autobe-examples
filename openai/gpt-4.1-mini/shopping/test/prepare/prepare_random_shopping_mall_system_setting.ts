import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_system_setting(
  input?: DeepPartial<IShoppingMallSystemSetting.ICreate>,
): IShoppingMallSystemSetting.ICreate {
  return {
    key: input?.key ?? RandomGenerator.alphaNumeric(10),
    value: input?.value ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description ??
      (RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({ sentences: 2 }),
      ]) as string | null),
    data_type:
      input?.data_type ??
      RandomGenerator.pick(["string", "int", "boolean", "json"] as const),
  };
}
