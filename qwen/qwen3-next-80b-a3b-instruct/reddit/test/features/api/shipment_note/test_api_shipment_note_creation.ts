import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentNote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipmentNote";
import { prepare_random_community_platform_shipment_note } from "../../../prepare/prepare_random_community_platform_shipment_note";
import { generate_random_community_platform_member_shipments_notes_index } from "../../../generate/generate_random_community_platform_member_shipments_notes_index";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_note_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Generate a random shipment ID for the note
  const shipmentId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a shipment note with valid content within MaxLength<1000> constraint
  const noteContent: string = RandomGenerator.paragraph({
    sentences: 10, // Generates approximately 10 words
    wordMin: 5,
    wordMax: 10,
  });
  const shipmentNote: IPageICommunityPlatformShipmentNote =
    await generate_random_community_platform_member_shipments_notes_index(
      memberConnection,
      {
        body: {
          content: noteContent,
        } satisfies ICommunityPlatformShipmentNote.ICreate,
        params: {
          shipmentId,
        },
      },
    );
  typia.assert(shipmentNote);
  // Step 4: Validate that the response structure matches IPageICommunityPlatformShipmentNote
  // The pagination object should adhere to IPage.IPagination schema but values are server-generated
  TestValidator.predicate(
    "pagination exists",
    shipmentNote.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is non-negative",
    shipmentNote.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    shipmentNote.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    shipmentNote.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    shipmentNote.pagination.pages >= 0,
  );
  // Verify data array contains at least the newly created note (there might be other notes)
  TestValidator.predicate(
    "data array is not empty",
    shipmentNote.data.length > 0,
  );
  // Find the note we just created and verify its properties
  const newNote = shipmentNote.data.find(
    (note) => note.content === noteContent,
  );
  TestValidator.predicate(
    "created note found in response",
    newNote !== undefined,
  );
  if (newNote) {
    TestValidator.equals("note content matches", newNote.content, noteContent);
    TestValidator.equals("note status is active", newNote.status, "active");
    TestValidator.equals("note priority is medium", newNote.priority, "medium");
    TestValidator.equals(
      "note is not system-generated",
      newNote.is_system_generated,
      false,
    );
    // Remove typia.assert on newNote.id since it doesn't exist on ICommunityPlatformShipmentNote
  }
  // Verify all notes in data array are valid ICommunityPlatformShipmentNote
  for (const note of shipmentNote.data) {
    TestValidator.predicate(
      "note has string content",
      typeof note.content === "string",
    );
    TestValidator.predicate(
      "note has valid status",
      ["active", "archived"].includes(note.status),
    );
    TestValidator.predicate(
      "note has valid priority",
      ["low", "medium", "high"].includes(note.priority),
    );
    TestValidator.predicate(
      "note has boolean is_system_generated",
      typeof note.is_system_generated === "boolean",
    );
  }
}