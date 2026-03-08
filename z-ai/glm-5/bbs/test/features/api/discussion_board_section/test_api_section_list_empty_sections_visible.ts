import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_list_empty_sections_visible(
  connection: api.IConnection,
): Promise<void> {
  // Call the sections index API with default parameters
  // No authentication required - accessible to all users including guests
  const response = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(response);
  // Verify sections are ordered by sequence (ascending) - business rule
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "sections ordered by sequence",
        response.data[i - 1].sequence <= response.data[i].sequence,
      );
    }
  }
  // Verify pagination structure reflects all available sections
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate(
    "total records matches data count or indicates more pages",
    response.pagination.records >= response.data.length,
  );
}
