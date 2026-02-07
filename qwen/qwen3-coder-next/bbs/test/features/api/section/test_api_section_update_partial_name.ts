import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_update_partial_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial section with both name and description
  const section = await api.functional.discussionBoard.sections.update(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(section);
  // 2. Perform partial update with only new name
  const updatedSection = await api.functional.discussionBoard.sections.update(
    connection,
    {
      body: {
        name: RandomGenerator.name(), // New name only, no description
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(updatedSection);
  // 3. Validate the update
  TestValidator.equals("section was updated", true, true);
}
