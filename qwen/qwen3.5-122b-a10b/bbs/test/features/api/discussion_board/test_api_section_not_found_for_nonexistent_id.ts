import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_not_found_for_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that does not exist in the database
  const nonExistentSectionId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent section and expect 404 error
  await TestValidator.httpError(
    "non-existent section returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.sections.at(connection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}
