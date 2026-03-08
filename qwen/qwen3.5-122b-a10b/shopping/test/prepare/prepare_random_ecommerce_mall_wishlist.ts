import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_wishlist(
  input?: DeepPartial<IEcommerceMallWishlist.ICreate>,
): IEcommerceMallWishlist.ICreate {
  return {
    ecommerce_mall_product_id:
      input?.ecommerce_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
