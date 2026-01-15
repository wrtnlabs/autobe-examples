import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductPriceRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPriceRule";
import { prepare_random_community_platform_product_price_rule } from "../prepare/prepare_random_community_platform_product_price_rule";
export async function generate_random_community_platform_admin_products_pricerules_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductPriceRule.ICreate> | undefined;
    params: {
      productCode: string;
    };
  },
): Promise<ICommunityPlatformProductPriceRule> {
  const prepared: ICommunityPlatformProductPriceRule.ICreate =
    prepare_random_community_platform_product_price_rule(props.body);
  return await api.functional.communityPlatform.admin.products.pricerules.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
    },
  );
}
