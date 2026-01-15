import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import { prepare_random_community_platform_shipment_address } from "../prepare/prepare_random_community_platform_shipment_address";
export async function generate_random_community_platform_shipments_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformShipmentAddress.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<ICommunityPlatformShipmentAddress> {
  const prepared: ICommunityPlatformShipmentAddress.ICreate =
    prepare_random_community_platform_shipment_address(props.body);
  return await api.functional.communityPlatform.shipments.addresses.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
