import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import { prepare_random_community_platform_sale } from "../prepare/prepare_random_community_platform_sale";
export async function generate_random_community_platform_member_sales_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSale.ICreate>;
  },
): Promise<ICommunityPlatformSale> {
  const prepared: ICommunityPlatformSale.ICreate =
    prepare_random_community_platform_sale(props.body);
  const result: ICommunityPlatformSale =
    await api.functional.communityPlatform.member.sales.create(connection, {
      body: prepared,
    });
  return result;
}
