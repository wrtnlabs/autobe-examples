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
    price:
      input?.price ??
      typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
    stock_quantity:
      input?.stock_quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
