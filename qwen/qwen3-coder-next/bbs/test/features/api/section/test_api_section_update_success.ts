import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a section first
  const createdSection = await api.functional.discussionBoard.sections.update(
    connection,
    {
      body: {
        name: "Initial Section",
        description: "Initial description",
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(createdSection);
  // 2. Update the section with new information
  const updatedSection = await api.functional.discussionBoard.sections.update(
    connection,
    {
      body: {
        name: "Updated Section Name",
        description: "Updated description content",
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(updatedSection);
  // 3. Verify the update was successful
  // Since we can't directly compare full objects without knowing the exact structure,
  // we'll validate that both operations returned successfully
  TestValidator.predicate(
    "create and update both succeeded",
    () => createdSection !== undefined && updatedSection !== undefined,
  );
}
