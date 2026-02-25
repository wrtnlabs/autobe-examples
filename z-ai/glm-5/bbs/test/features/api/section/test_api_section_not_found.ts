import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test 404 Not Found response when requesting a non-existent section.
 * This tests the business logic that properly distinguishes between valid
 * resource requests and requests for resources that don't exist.
 */
export async function test_api_section_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the database
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch a section with non-existent ID
  // Should throw HttpError with 404 status
  await TestValidator.httpError("section not found", 404, async () => {
    await api.functional.discussionBoard.sections.at(connection, {
      sectionId: nonExistentSectionId,
    });
  });
}
