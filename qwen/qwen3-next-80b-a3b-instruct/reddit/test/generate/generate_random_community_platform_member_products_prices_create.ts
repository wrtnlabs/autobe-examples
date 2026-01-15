import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { prepare_random_community_platform_product_price } from "../prepare/prepare_random_community_platform_product_price";
export async function generate_random_community_platform_member_products_prices_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductPrice.ICreate> | undefined;
    params: {
      productCode: string;
    };
  },
): Promise<ICommunityPlatformProductPrice> {
  const prepared: ICommunityPlatformProductPrice.ICreate =
    prepare_random_community_platform_product_price(props.body);
  return await api.functional.communityPlatform.member.products.prices.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
    },
  );
}
