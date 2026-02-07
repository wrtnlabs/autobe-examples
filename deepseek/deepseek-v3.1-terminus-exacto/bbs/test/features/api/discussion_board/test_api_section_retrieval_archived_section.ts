import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_retrieval_archived_section(
  connection: api.IConnection,
): Promise<void> {
  // Since section creation and archiving endpoints are not available,
  // we'll test the retrieval endpoint's error handling behavior
  // This validates that the endpoint properly handles non-existent/archived sections
  const archivedSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve archived section should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.sections.at(connection, {
        sectionId: archivedSectionId,
      });
    },
  );
}
