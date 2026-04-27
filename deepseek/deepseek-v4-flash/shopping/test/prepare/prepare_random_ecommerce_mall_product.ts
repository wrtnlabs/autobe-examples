import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall product creation data for E2E testing.
 *
 * Generates a complete IECommerceMallProduct.ICreate with randomized values
 * for the product name, description, optional category assignment, and base
 * price. The product must have at least one variant added afterwards before
 * it can be purchased by customers.
 *
 * @param input Partial input to override specific generated fields
 * @returns A fully populated IECommerceMallProduct.ICreate object
 */
export function prepare_random_ecommerce_mall_product(
  input?: DeepPartial<IECommerceMallProduct.ICreate> | undefined,
): IECommerceMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    category_id:
      input?.category_id !== undefined
        ? input.category_id
        : typia.random<string & tags.Format<"uuid">>(),
    base_price:
      input?.base_price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<999999>
      >(),
  };
}
