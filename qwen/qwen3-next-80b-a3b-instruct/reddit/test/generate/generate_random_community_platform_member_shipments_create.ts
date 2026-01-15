import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_shipment } from "../prepare/prepare_random_community_platform_shipment";
export async function generate_random_community_platform_member_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformShipment.ICreate>;
  },
): Promise<ICommunityPlatformShipment> {
  const prepared: ICommunityPlatformShipment.ICreate =
    prepare_random_community_platform_shipment(props.body);
  const result: ICommunityPlatformShipment =
    await api.functional.communityPlatform.member.shipments.create(connection, {
      body: prepared,
    });
  return result;
}
