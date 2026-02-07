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
 * Test section retrieval with a non-existent section ID.
 *
 * This test verifies that the API properly handles requests for sections that
 * do not exist by returning a 404 Not Found error. It uses a valid UUID format
 * that doesn't correspond to any existing section in the database.
 */
export async function test_api_section_retrieval_nonexistent_section(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that likely doesn't exist in the database
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // Verify that the API returns a 404 error for non-existent section
  await TestValidator.httpError(
    "retrieving non-existent section should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.sections.at(connection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}
