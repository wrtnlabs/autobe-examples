import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce product creation data for E2E testing.
 *
 * Generates a complete IEcommerceProduct.ICreate with randomized values for product name, description, category, and price. Optionally includes SKU variants with option combinations and product images with proper URI formatting.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IEcommerceProduct.ICreate instance with all required fields
 */
export function prepare_random_ecommerce_product(
  input?: DeepPartial<IEcommerceProduct.ICreate>,
): IEcommerceProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    base_price:
      input?.base_price ??
      typia.random<number & tags.Type<"double"> & tags.Minimum<1>>(),
    variants: input?.variants
      ? input.variants.map((variant) => ({
          sku_code: variant.sku_code ?? RandomGenerator.alphaNumeric(8),
          option_values:
            variant.option_values ??
            `color=${RandomGenerator.name(1)};size=${RandomGenerator.pick(["S", "M", "L", "XL"] as const)}`,
          price:
            variant.price ??
            typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.pick(["S", "M", "L", "XL"] as const)}`,
            price: typia.random<
              number & tags.Type<"double"> & tags.Minimum<0>
            >(),
          }),
        ),
    images: input?.images
      ? input.images.map((image) => ({
          image_url:
            image.image_url ??
            `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
          }),
        ),
  };
}
