import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_wishlist_item(
  input?: DeepPartial<IEcommerceMallWishlistItem.ICreate> | undefined,
): IEcommerceMallWishlistItem.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
