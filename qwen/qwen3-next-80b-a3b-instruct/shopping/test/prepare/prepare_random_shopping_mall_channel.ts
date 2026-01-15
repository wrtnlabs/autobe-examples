import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
export function prepare_random_shopping_mall_channel(
  input?: DeepPartial<IShoppingMallChannel.ICreate>,
): IShoppingMallChannel.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.pick(["mainstore-", "partner-"] as const) +
        RandomGenerator.alphabets(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<15>
          >(),
        ),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    salesType:
      input?.salesType ??
      RandomGenerator.pick([
        "online",
        "physical",
        "marketplace",
        "hybrid",
      ] as const),
    active: input?.active ?? RandomGenerator.pick([true, false] as const),
  };
}
