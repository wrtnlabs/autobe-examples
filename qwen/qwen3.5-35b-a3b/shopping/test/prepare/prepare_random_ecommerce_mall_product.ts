import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallProduct.ICreate with randomized values.
 */
export function prepare_random_ecommerce_mall_product(
  input?: DeepPartial<IEcommerceMallProduct.ICreate> | undefined,
): IEcommerceMallProduct.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    base_price:
      input?.base_price ?? typia.random<number & tags.ExclusiveMinimum<0>>(),
  };
}
