import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentNote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipmentNote";
import { prepare_random_community_platform_shipment_note } from "../../../prepare/prepare_random_community_platform_shipment_note";
import { generate_random_community_platform_admin_shipments_notes_index } from "../../../generate/generate_random_community_platform_admin_shipments_notes_index";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_note_add_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate admin user
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a valid shipment note with content within 1000-character limit
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const noteContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  }); // Under 1000 chars
  const result =
    await generate_random_community_platform_admin_shipments_notes_index(
      adminConnection,
      {
        body: {
          content: noteContent,
        } satisfies ICommunityPlatformShipmentNote.ICreate,
        params: {
          shipmentId,
        },
      },
    );
  typia.assert(result);
  // Step 3: Validate response structure according to IPageICommunityPlatformShipmentNote.IList
  // Response has pagination and data array of strings (ICommunityPlatformShipmentNote.IList)
  TestValidator.equals(
    "pagination is valid",
    result.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    result.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records count is valid",
    result.pagination.records >= 1,
    true,
  );
  TestValidator.equals(
    "pagination pages count is valid",
    result.pagination.pages > 0,
    true,
  );
  // Data must be an array of strings (ICommunityPlatformShipmentNote.IList)
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  TestValidator.equals(
    "data array has at least one item",
    result.data.length >= 1,
    true,
  );
  // Verify the newly added note content is in the data array
  // Since ICommunityPlatformShipmentNote.IList is string, data array contains string values
  const noteStringExists = result.data.some((item) => item === noteContent);
  TestValidator.predicate(
    "new note content exists in data array",
    () => noteStringExists,
  );
  // Validate content length constraint (max 1000 chars)
  TestValidator.predicate("all note contents are under 1000 chars", () => {
    return result.data.every((note) => note.length <= 1000);
  });
}
