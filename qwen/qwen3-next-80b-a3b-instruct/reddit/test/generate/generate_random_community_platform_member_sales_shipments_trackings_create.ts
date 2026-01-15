import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import type { ICoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoordinates";
import { prepare_random_community_platform_shipment_tracking } from "../prepare/prepare_random_community_platform_shipment_tracking";
export async function generate_random_community_platform_member_sales_shipments_trackings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformShipmentTracking.ICreate>;
    params: {
      saleCode: string;
      shipmentId: string;
    };
  },
): Promise<ICommunityPlatformShipmentTracking> {
  const prepared: ICommunityPlatformShipmentTracking.ICreate =
    prepare_random_community_platform_shipment_tracking(props.body);
  return await api.functional.communityPlatform.member.sales.shipments.trackings.create(
    connection,
    {
      saleCode: props.params.saleCode,
      shipmentId: props.params.shipmentId,
      body: prepared,
    },
  );
}
