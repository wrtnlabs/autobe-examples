import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import { prepare_random_community_platform_sales_order_note } from "../prepare/prepare_random_community_platform_sales_order_note";
export async function generate_random_community_platform_member_salesordernotes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSalesOrderNote.ICreate> | undefined;
  },
): Promise<ICommunityPlatformSalesOrderNote> {
  const prepared: ICommunityPlatformSalesOrderNote.ICreate =
    prepare_random_community_platform_sales_order_note(props.body);
  const result: ICommunityPlatformSalesOrderNote =
    await api.functional.communityPlatform.member.salesordernotes.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
