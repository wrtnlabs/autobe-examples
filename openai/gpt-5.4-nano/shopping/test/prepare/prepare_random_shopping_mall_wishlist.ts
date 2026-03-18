import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_wishlist(
  input?: DeepPartial<IShoppingMallWishlist.ICreate> | undefined,
): IShoppingMallWishlist.ICreate {
  return {
    items: input?.items
      ? input.items.map((item) => ({
          shopping_mall_product_id:
            item.shopping_mall_product_id ??
            typia.random<string & tags.Format<"uuid">>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            shopping_mall_product_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          }),
        ),
  };
}
