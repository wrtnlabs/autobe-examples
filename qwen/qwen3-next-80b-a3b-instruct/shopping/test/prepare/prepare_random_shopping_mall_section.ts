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
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 2,
        wordMax: 5,
      }),
    description:
      input?.description ??
      (input?.description === null
        ? null
        : RandomGenerator.content({
            paragraphs: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            sentenceMin: 5,
            sentenceMax: 10,
          })),
    parentId:
      input?.parentId === undefined
        ? typia.random<string & tags.Format<"uuid">>()
        : input?.parentId,
  };
}
