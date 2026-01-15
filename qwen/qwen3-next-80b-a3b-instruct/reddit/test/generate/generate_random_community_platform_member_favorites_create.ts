import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleFavorite";
import { prepare_random_community_platform_sale_favorite } from "../prepare/prepare_random_community_platform_sale_favorite";
export async function generate_random_community_platform_member_favorites_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSaleFavorite.ICreate>;
  },
): Promise<ICommunityPlatformSaleFavorite> {
  const prepared: ICommunityPlatformSaleFavorite.ICreate =
    prepare_random_community_platform_sale_favorite(props.body);
  const result: ICommunityPlatformSaleFavorite =
    await api.functional.communityPlatform.member.favorites.create(connection, {
      body: prepared,
    });
  return result;
}
