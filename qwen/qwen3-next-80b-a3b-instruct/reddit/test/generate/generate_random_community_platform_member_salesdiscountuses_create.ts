import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSalesDiscountUse } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesDiscountUse";
import { prepare_random_community_platform_sales_discount_use } from "../prepare/prepare_random_community_platform_sales_discount_use";
export async function generate_random_community_platform_member_salesdiscountuses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSalesDiscountUse.ICreate> | undefined;
  },
): Promise<ICommunityPlatformSalesDiscountUse> {
  const prepared: ICommunityPlatformSalesDiscountUse.ICreate =
    prepare_random_community_platform_sales_discount_use(props.body);
  return await api.functional.communityPlatform.member.salesdiscountuses.create(
    connection,
    {
      body: prepared,
    },
  );
}
