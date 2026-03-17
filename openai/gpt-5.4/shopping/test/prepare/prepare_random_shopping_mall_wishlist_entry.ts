import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_wishlist_entry(
  input?: DeepPartial<IShoppingMallWishlistEntry.ICreate>,
): IShoppingMallWishlistEntry.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
