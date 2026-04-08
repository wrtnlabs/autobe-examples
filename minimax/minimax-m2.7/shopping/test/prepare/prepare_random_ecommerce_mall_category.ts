import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_category(
  input?: DeepPartial<IEcommerceMallCategory.ICreate>,
): IEcommerceMallCategory.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    description:
      input?.description === undefined
        ? RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })
        : input.description,
    parent_id: input?.parent_id,
  };
}
