import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export function prepare_random_shopping_mall_section(
  input?: DeepPartial<IShoppingMallSection.ICreate>,
): IShoppingMallSection.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: Math.floor(Math.random() * 5) + 1,
      }),
    position:
      input?.position ??
      Math.floor(Math.random() * 100) + 1,
    channel_id:
      input?.channel_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}