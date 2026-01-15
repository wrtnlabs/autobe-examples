import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product } from "../prepare/prepare_random_community_platform_product";
export async function generate_random_community_platform_member_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProduct.ICreate>;
  },
): Promise<ICommunityPlatformProduct> {
  const prepared: ICommunityPlatformProduct.ICreate =
    prepare_random_community_platform_product(props.body);
  const result: ICommunityPlatformProduct =
    await api.functional.communityPlatform.member.products.create(connection, {
      body: prepared,
    });
  return result;
}
