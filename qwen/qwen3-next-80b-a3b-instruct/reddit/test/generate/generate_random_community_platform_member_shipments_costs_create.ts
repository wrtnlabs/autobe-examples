import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentCost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentCost";
import { prepare_random_community_platform_shipment_cost } from "../prepare/prepare_random_community_platform_shipment_cost";
export async function generate_random_community_platform_member_shipments_costs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformShipmentCost.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<ICommunityPlatformShipmentCost> {
  const prepared: ICommunityPlatformShipmentCost.ICreate =
    prepare_random_community_platform_shipment_cost(props.body);
  return await api.functional.communityPlatform.member.shipments.costs.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
