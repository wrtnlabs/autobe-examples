import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

class RandomDataGenerator {
  static generateUUID(): string {
    return typia.random<string & tags.Format<"uuid">>();
  }
}
export function prepare_random_ecommerce_wishlist_item(
  input?: DeepPartial<IEcommerceWishlistItem.ICreate>,
): IEcommerceWishlistItem.ICreate {
  return {
    productVariantId:
      input?.productVariantId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
