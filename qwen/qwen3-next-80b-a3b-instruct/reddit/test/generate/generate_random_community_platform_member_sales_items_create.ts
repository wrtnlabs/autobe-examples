import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
import { prepare_random_community_platform_sale_item } from "../prepare/prepare_random_community_platform_sale_item";
export async function generate_random_community_platform_member_sales_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSaleItem.ICreate> | undefined;
    params: {
      saleCode: string;
    };
  },
): Promise<ICommunityPlatformSaleItem> {
  const prepared: ICommunityPlatformSaleItem.ICreate =
    prepare_random_community_platform_sale_item(props.body);
  return await api.functional.communityPlatform.member.sales.items.create(
    connection,
    {
      body: prepared,
      saleCode: props.params.saleCode,
    },
  );
}
