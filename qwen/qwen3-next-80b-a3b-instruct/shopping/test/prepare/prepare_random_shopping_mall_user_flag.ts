import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";
export function prepare_random_shopping_mall_user_flag(
  input?: DeepPartial<IShoppingMallUserFlag.ICreate>,
): IShoppingMallUserFlag.ICreate {
  return {
    flag_key: RandomGenerator.pick([
      "suspicious_activity",
      "policy_violation",
      "account_alert",
    ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
        >(),
      }),
  };
}
