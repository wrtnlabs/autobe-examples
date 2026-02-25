import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_product_variant(
  input?: DeepPartial<IEcommerceProductVariant.ICreate> | undefined,
): IEcommerceProductVariant.ICreate {
  return {
    sku: input?.sku ?? RandomGenerator.alphaNumeric(8),
    option_values:
      input?.option_values ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    price_override:
      input?.price_override ??
      (Math.random() > 0.5 ? typia.random<number & tags.Minimum<0>>() : null),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
