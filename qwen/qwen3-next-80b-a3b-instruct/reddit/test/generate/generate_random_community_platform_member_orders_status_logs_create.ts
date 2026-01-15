import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
import { prepare_random_community_platform_order_status_log } from "../prepare/prepare_random_community_platform_order_status_log";
export async function generate_random_community_platform_member_orders_status_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformOrderStatusLog.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<ICommunityPlatformOrderStatusLog> {
  const prepared: ICommunityPlatformOrderStatusLog.ICreate =
    prepare_random_community_platform_order_status_log(props.body);
  return await api.functional.communityPlatform.member.orders.status_logs.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
