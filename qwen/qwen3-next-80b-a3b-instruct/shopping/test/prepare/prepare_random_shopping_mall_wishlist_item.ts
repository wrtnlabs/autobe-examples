import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
export function prepare_random_shopping_mall_wishlist_item(
  input?: DeepPartial<IShoppingMallWishlistItem.ICreate> | undefined,
): IShoppingMallWishlistItem.ICreate {
  return {
    productVariantId:
      input?.productVariantId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
