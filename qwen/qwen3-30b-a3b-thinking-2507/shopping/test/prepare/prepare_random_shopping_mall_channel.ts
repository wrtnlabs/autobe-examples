import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_channel(
  input?: DeepPartial<IShoppingMallChannel.ICreate>,
): IShoppingMallChannel.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(1),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 1 }),
  };
}
