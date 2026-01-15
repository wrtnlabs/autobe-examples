import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentNote";
export async function test_api_shipment_note_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection with the host
  const testConnection: api.IConnection = { host: connection.host };
  // Generate random shipmentId and noteId values (UUID format)
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const noteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the shipment note using both shipmentId and noteId path parameters
  const retrievedNote =
    await api.functional.communityPlatform.shipments.notes.at(testConnection, {
      shipmentId,
      noteId,
    });
  // Validate that the retrieved note matches the ICommunityPlatformShipmentNote type
  typia.assert(retrievedNote);
}
