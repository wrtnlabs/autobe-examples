import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_not_found_for_deleted_section(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID to simulate a deleted/non-existent section
  const deletedSectionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the deleted section - should return 404
  await TestValidator.httpError(
    "deleted section returns 404 Not Found",
    404,
    async () =>
      api.functional.discussionBoard.sections.at(connection, {
        sectionId: deletedSectionId,
      }),
  );
}
