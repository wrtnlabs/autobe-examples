import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_update_partial_description(
  connection: api.IConnection,
): Promise<void> {
  // Test partial section update with only description change
  // The endpoint supports null authorization and partial updates
  const updatedSection = await api.functional.discussionBoard.sections.update(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.IUpdate,
    },
  );
  typia.assert(updatedSection);
}
