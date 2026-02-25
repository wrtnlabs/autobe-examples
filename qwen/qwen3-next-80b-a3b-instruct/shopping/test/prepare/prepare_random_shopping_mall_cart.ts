import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_cart(
  input?: DeepPartial<IShoppingMallCart.ICreate> | undefined,
): IShoppingMallCart.ICreate {
  return {
    variant_id:
      input?.variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
      >(),
  };
}
