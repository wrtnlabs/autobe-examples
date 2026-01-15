import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentNote";
import { prepare_random_community_platform_shipment_note } from "../prepare/prepare_random_community_platform_shipment_note";
export async function generate_random_community_platform_member_shipments_notes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformShipmentNote.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<ICommunityPlatformShipmentNote> {
  const prepared: ICommunityPlatformShipmentNote.ICreate =
    prepare_random_community_platform_shipment_note(props.body);
  return await api.functional.communityPlatform.member.shipments.notes.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
