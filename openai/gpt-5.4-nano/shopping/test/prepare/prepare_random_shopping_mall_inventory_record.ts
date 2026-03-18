import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate> | undefined,
): IShoppingMallInventoryRecord.ICreate {
  const stock_quantity =
    input?.stock_quantity ??
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const reserved_quantity =
    input?.reserved_quantity ??
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const available_quantity =
    input?.available_quantity ??
    Math.max(0, stock_quantity - reserved_quantity);
  return {
    shopping_mall_product_variant_id:
      input?.shopping_mall_product_variant_id ??
      typia.random<string & tags.Format<"uuid">>(),
    stock_quantity,
    reserved_quantity,
    available_quantity: available_quantity as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
