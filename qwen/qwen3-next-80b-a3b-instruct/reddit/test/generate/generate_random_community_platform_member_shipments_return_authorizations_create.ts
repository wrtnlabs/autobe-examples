import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentReturnAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentReturnAuthorization";
import { prepare_random_community_platform_shipment_return_authorization } from "../prepare/prepare_random_community_platform_shipment_return_authorization";
export async function generate_random_community_platform_member_shipments_return_authorizations_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformShipmentReturnAuthorization.ICreate>
      | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<ICommunityPlatformShipmentReturnAuthorization> {
  const prepared: ICommunityPlatformShipmentReturnAuthorization.ICreate =
    prepare_random_community_platform_shipment_return_authorization(props.body);
  return await api.functional.communityPlatform.member.shipments.return_authorizations.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
