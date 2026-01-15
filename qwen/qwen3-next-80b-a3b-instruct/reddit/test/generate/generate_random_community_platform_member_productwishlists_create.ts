import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductWishlist";
import { prepare_random_community_platform_product_wishlist } from "../prepare/prepare_random_community_platform_product_wishlist";
export async function generate_random_community_platform_member_productwishlists_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductWishlist.ICreate> | undefined;
  },
): Promise<ICommunityPlatformProductWishlist> {
  const prepared: ICommunityPlatformProductWishlist.ICreate =
    prepare_random_community_platform_product_wishlist(props.body);
  return await api.functional.communityPlatform.member.productwishlists.create(
    connection,
    {
      body: prepared,
    },
  );
}
