import { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_inventory(
  input?: DeepPartial<IEcommerceInventory.ICreate> | undefined,
): IEcommerceInventory.ICreate {
  return {
    quantity_change:
      input?.quantity_change ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-1000> & tags.Maximum<1000>
      >(),
    reason:
      input?.reason ??
      typia.random<
        string & tags.Pattern<"^(restock|customer_order|return|excess|scrap)$">
      >(),
  };
}
