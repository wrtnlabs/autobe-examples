import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
export function prepare_random_shopping_mall_configuration(
  input?: DeepPartial<IShoppingMallConfiguration.ICreate> | undefined,
): IShoppingMallConfiguration.ICreate {
  return {
    key:
      input?.key ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
      }).replace(/\s+/g, "."),
    value:
      input?.value ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        sentenceMin: 10,
        sentenceMax: 20,
        wordMin: 4,
        wordMax: 8,
      }),
  };
}
