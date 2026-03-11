import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test handling of non-existent section IDs.
 * Provide an invalid UUID or a UUID that doesn't correspond to any section in the system.
 * Verify that the API returns an appropriate error response (404 Not Found) with clear error messaging.
 * Ensure the system properly validates section existence before attempting retrieval.
 */
export async function test_api_section_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a section with the non-existent ID
  // This should throw an HttpError with 404 status
  await TestValidator.httpError(
    "section retrieval with non-existent ID should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.sections.at(connection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}
