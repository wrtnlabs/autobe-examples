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
 * defaults while allowing test cases to override any field through DeepPartial
 * input.
 */
export function prepare_random_mall_platform_product(
  input?: DeepPartial<IMallPlatformProduct.ICreate> | undefined,
): IMallPlatformProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    categoryId:
      input?.categoryId !== undefined
        ? input.categoryId
        : typia.random<string & tags.Format<"uuid">>(),
    basePrice:
      input?.basePrice ??
      typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
  };
}
