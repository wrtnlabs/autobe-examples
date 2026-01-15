import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
import { prepare_random_community_platform_sale_discount_code } from "../prepare/prepare_random_community_platform_sale_discount_code";
export async function generate_random_community_platform_admin_salesdiscountcodes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSaleDiscountCode.ICreate>;
  },
): Promise<ICommunityPlatformSaleDiscountCode> {
  const prepared: ICommunityPlatformSaleDiscountCode.ICreate =
    prepare_random_community_platform_sale_discount_code(props.body);
  const result: ICommunityPlatformSaleDiscountCode =
    await api.functional.communityPlatform.admin.salesdiscountcodes.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
