import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_wishlist_item } from "../prepare/prepare_random_ecommerce_platform_wishlist_item";

export async function generate_random_ecommerce_platform_customer_wishlist_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformWishlistItem.ICreate> | undefined;
  },
): Promise<IEcommercePlatformWishlistItem> {
  const prepared: IEcommercePlatformWishlistItem.ICreate =
    prepare_random_ecommerce_platform_wishlist_item(props.body);
  const result: IEcommercePlatformWishlistItem =
    await api.functional.ecommercePlatform.customer.wishlist.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
