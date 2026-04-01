import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_wishlist_item(
  input?: DeepPartial<IMallPlatformWishlistItem.ICreate> | undefined,
): IMallPlatformWishlistItem.ICreate {
  return {
    mallPlatformProductId:
      input?.mallPlatformProductId ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
