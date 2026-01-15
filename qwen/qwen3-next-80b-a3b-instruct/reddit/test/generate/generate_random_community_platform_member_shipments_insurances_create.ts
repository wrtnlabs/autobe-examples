import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentInsurance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentInsurance";
import { prepare_random_community_platform_shipment_insurance } from "../prepare/prepare_random_community_platform_shipment_insurance";
export async function generate_random_community_platform_member_shipments_insurances_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformShipmentInsurance.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<ICommunityPlatformShipmentInsurance> {
  const prepared: ICommunityPlatformShipmentInsurance.ICreate =
    prepare_random_community_platform_shipment_insurance(props.body);
  return await api.functional.communityPlatform.member.shipments.insurances.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
