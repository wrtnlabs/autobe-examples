import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleTaxRate";
import { prepare_random_community_platform_sale_tax_rate } from "../prepare/prepare_random_community_platform_sale_tax_rate";
export async function generate_random_community_platform_admin_salestaxrates_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSaleTaxRate.ICreate>;
  },
): Promise<ICommunityPlatformSaleTaxRate> {
  const prepared: ICommunityPlatformSaleTaxRate.ICreate =
    prepare_random_community_platform_sale_tax_rate(props.body);
  const result: ICommunityPlatformSaleTaxRate =
    await api.functional.communityPlatform.admin.salestaxrates.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
