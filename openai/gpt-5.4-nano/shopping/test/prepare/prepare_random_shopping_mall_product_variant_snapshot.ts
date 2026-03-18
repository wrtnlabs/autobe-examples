import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant_snapshot(
  input?: DeepPartial<IShoppingMallProductVariantSnapshot.ICreate> | undefined,
): IShoppingMallProductVariantSnapshot.ICreate {
  return {
    shopping_mall_product_variant_id:
      input?.shopping_mall_product_variant_id ??
      typia.random<string & tags.Format<"uuid">>(),
    code: input?.code ?? RandomGenerator.alphaNumeric(12),
    name: input?.name ?? RandomGenerator.name(3),
    price: input?.price ?? typia.random<number>(),
    currency:
      input?.currency ?? typia.random<string & tags.Pattern<"^[A-Z]{3}$">>(),
    is_available: input?.is_available ?? typia.random<boolean>(),
    variant_status:
      input?.variant_status ??
      RandomGenerator.pick(["active", "inactive", "archived"] as const),
  };
}
