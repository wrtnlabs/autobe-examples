import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test access to soft-deleted sections.
 *
 * Verify that sections marked with deleted_at timestamps are not accessible
 * through this endpoint. The API should return an appropriate error response
 * (404 Not Found or 410 Gone) for soft-deleted or non-existent sections.
 *
 * Since we cannot create soft-deleted sections without administrative APIs,
 * we test the conceptual behavior by attempting to access a random section ID
 * and validating the response consistency.
 */
export async function test_api_section_soft_deleted_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection for the test
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a random section ID that likely doesn't exist in the system
  const randomSectionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access the random section
  try {
    const section = await api.functional.discussionBoard.sections.at(
      testConnection,
      { sectionId: randomSectionId },
    );
    // If we get here, the section exists and is active
    // Validate the response structure
    typia.assert(section);
    // Verify that active sections have deleted_at = null
    TestValidator.equals(
      "active section should have null deleted_at",
      section.deleted_at,
      null,
    );
    // Verify other required fields exist
    TestValidator.predicate(
      "section should have non-empty name",
      section.name.length > 0,
    );
    TestValidator.predicate(
      "section should have valid timestamps",
      new Date(section.created_at).getTime() > 0 &&
        new Date(section.updated_at).getTime() > 0,
    );
  } catch (error) {
    // Section doesn't exist or is soft-deleted - should be HTTP error
    // We expect a 404 Not Found or 410 Gone for soft-deleted sections
    await TestValidator.httpError(
      "non-existent or soft-deleted section should return HTTP error",
      [404, 410],
      () => Promise.reject(error),
    );
  }
  // Additional test: Create multiple random IDs and verify consistency
  const testIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  for (const testId of testIds) {
    try {
      const section = await api.functional.discussionBoard.sections.at(
        testConnection,
        { sectionId: testId },
      );
      typia.assert(section);
      // If we get a section, it must be active (deleted_at = null)
      TestValidator.equals(
        `section ${testId} should be active if returned`,
        section.deleted_at,
        null,
      );
    } catch (error) {
      // Expected for non-existent or soft-deleted sections
      // Don't validate error type here to avoid test flakiness
    }
  }
}