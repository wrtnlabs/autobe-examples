import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate> | undefined,
): IShoppingMallProduct.ICreate {
  return {
    shopping_mall_category_id:
      input?.shopping_mall_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
    code: input?.code ?? RandomGenerator.alphaNumeric(10),
    name: input?.name ?? RandomGenerator.name(3),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 2,
        sentenceMax: 4,
        wordMin: 3,
        wordMax: 8,
      }),
    is_featured: input?.is_featured ?? typia.random<boolean>(),
  };
}
