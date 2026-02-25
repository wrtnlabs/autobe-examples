import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of an active section with complete metadata.
 * Verifies that the section retrieval endpoint returns all required fields
 * including name, description, status set to 'active', display order,
 * creation timestamp, update timestamp, and administrator audit trail.
 */
export async function test_api_section_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random section ID that would correspond to an active section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve the section
  const section = await api.functional.discussionBoard.sections.at(connection, {
    sectionId,
  });
  // Validate the response using typia.assert for complete type validation
  typia.assert(section);
  // Verify that the section has active status
  TestValidator.equals(
    "section status should be active",
    section.status,
    "active",
  );
  // Validate that all required fields are present and properly populated
  TestValidator.predicate(
    "section should have an ID",
    () => section.id.length > 0,
  );
  TestValidator.predicate(
    "section should have a name",
    () => section.name.length > 0,
  );
  TestValidator.predicate(
    "section should have a description",
    () => section.description.length > 0,
  );
  // Validate timestamp formats using TestValidator.predicate
  TestValidator.predicate("created_at should be valid ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      section.created_at,
    ),
  );
  TestValidator.predicate("updated_at should be valid ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      section.updated_at,
    ),
  );
  // Validate administrator audit trail - createdByAdmin should exist
  typia.assert(section.createdByAdmin);
  TestValidator.predicate(
    "createdByAdmin should have valid admin ID",
    () => section.createdByAdmin.id.length > 0,
  );
  TestValidator.predicate("createdByAdmin should have valid email", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(section.createdByAdmin.email),
  );
  // Check lastModifiedByAdmin - it can be null or have a valid admin
  if (section.lastModifiedByAdmin !== null) {
    typia.assert(section.lastModifiedByAdmin);
    TestValidator.predicate(
      "lastModifiedByAdmin should have valid admin ID",
      () => section.lastModifiedByAdmin!.id.length > 0,
    );
  }
  // Validate display_order is a valid integer
  TestValidator.predicate("display_order should be a valid integer", () =>
    Number.isInteger(section.display_order),
  );
  // Validate deleted_at - should be null for active section
  TestValidator.equals(
    "deleted_at should be null for active section",
    section.deleted_at,
    null,
  );
}
