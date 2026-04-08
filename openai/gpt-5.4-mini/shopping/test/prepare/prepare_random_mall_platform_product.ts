import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform product creation data for E2E testing.
 *
 * Generates a complete IMallPlatformProduct.ICreate object with realistic
 * default values. Every field can be overridden through the DeepPartial input,
 * making it suitable for both happy-path and edge-case test customization.
 */
export function prepare_random_mall_platform_product(
  input?: DeepPartial<IMallPlatformProduct.ICreate> | undefined,
): IMallPlatformProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 7,
        wordMin: 4,
        wordMax: 9,
      }),
    categoryId:
      input?.categoryId ?? typia.random<string & tags.Format<"uuid">>(),
    basePrice:
      input?.basePrice ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
      >(),
  };
}
