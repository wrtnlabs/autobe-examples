import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform product creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformProduct.ICreate with randomized values
 * for all required fields including product name, description, base price, and
 * category assignment.
 *
 * The product name uses realistic naming conventions, the description generates
 * multi-paragraph content suitable for product detail pages, the base price
 * is a random numeric value for marketplace currency, and the category_id is a
 * valid UUID that would reference a non-deleted category in the system.
 */
export function prepare_random_ecommerce_platform_product(
  input?: DeepPartial<IEcommercePlatformProduct.ICreate> | undefined,
): IEcommercePlatformProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    base_price: input?.base_price ?? typia.random<number>(),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
