import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_section(
  input?: DeepPartial<IShoppingMallSection.ICreate> | undefined,
): IShoppingMallSection.ICreate {
  return {
    parentSectionId:
      input?.parentSectionId ?? typia.random<string & tags.Format<"uuid">>(),
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<number>(),
      }),
  };
}