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
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ??
      (Math.random() < 0.5 ? null : RandomGenerator.content({ paragraphs: 1 })),
    parent_category_id:
      input?.parent_category_id ??
      (Math.random() < 0.3
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
  };
}
