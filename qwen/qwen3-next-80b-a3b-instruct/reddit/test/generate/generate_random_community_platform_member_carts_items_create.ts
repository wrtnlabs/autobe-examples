import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import { prepare_random_community_platform_cart_item } from "../prepare/prepare_random_community_platform_cart_item";
export async function generate_random_community_platform_member_carts_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCartItem.ICreate> | undefined;
    params: {
      cartId: string;
    };
  },
): Promise<ICommunityPlatformCartItem> {
  const prepared: ICommunityPlatformCartItem.ICreate =
    prepare_random_community_platform_cart_item(props.body);
  return await api.functional.communityPlatform.member.carts.items.create(
    connection,
    {
      body: prepared,
      cartId: props.params.cartId,
    },
  );
}
