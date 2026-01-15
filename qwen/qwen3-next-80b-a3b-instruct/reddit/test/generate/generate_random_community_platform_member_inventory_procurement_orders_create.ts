import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryProcurementOrder";
import { prepare_random_community_platform_inventory_procurement_order } from "../prepare/prepare_random_community_platform_inventory_procurement_order";
export async function generate_random_community_platform_member_inventory_procurement_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformInventoryProcurementOrder.ICreate>;
  },
): Promise<ICommunityPlatformInventoryProcurementOrder> {
  const prepared: ICommunityPlatformInventoryProcurementOrder.ICreate =
    prepare_random_community_platform_inventory_procurement_order(props.body);
  return await api.functional.communityPlatform.member.inventory_procurement_orders.create(
    connection,
    {
      body: prepared,
    },
  );
}
