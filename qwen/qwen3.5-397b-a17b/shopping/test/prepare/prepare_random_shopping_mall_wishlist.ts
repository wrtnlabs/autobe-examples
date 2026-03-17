import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_wishlist(
  input?: DeepPartial<IShoppingMallWishlist.ICreate>,
): IShoppingMallWishlist.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
