import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IEcommerceMallProductVariant.ICreate>,
): IEcommerceMallProductVariant.ICreate {
  return {
    sku: input?.sku ?? RandomGenerator.alphaNumeric(10),
    options: input?.options
      ? Object.entries(input.options).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value ?? RandomGenerator.name(2),
          }),
          {} as {
            [key: string]: string;
          },
        )
      : { size: RandomGenerator.name(2), color: RandomGenerator.name(1) },
    base_price:
      input?.base_price ??
      typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
    sale_price:
      input?.sale_price ??
      (Math.random() > 0.5
        ? typia.random<number & tags.Type<"double"> & tags.Minimum<0>>()
        : null),
    stock_quantity:
      input?.stock_quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    status:
      input?.status ??
      RandomGenerator.pick(["active", "inactive", "discontinued"] as const),
    sort_order:
      input?.sort_order ?? typia.random<number & tags.Type<"int32">>(),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
