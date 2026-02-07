import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the database
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // Send GET request to retrieve a non-existent section
  await TestValidator.httpError(
    "should return 404 for non-existent section",
    404,
    async () => {
      await api.functional.discussionBoard.sections.at(connection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}
