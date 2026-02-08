import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_discussion_board_section_listing_sort_by_name_descending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });

  // 2. Request with empty body since no explicit sort property declared in DTO
  const body: IDiscussionBoardSection.IRequest = {};

  // 3. Request list of sections
  const output: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.administrator.sections.index(
      adminConnection,
      { body },
    );

  typia.assert(output);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    output.pagination !== null && typeof output.pagination === "object",
  );
  TestValidator.predicate("pagination current page is zero or more", output.pagination.current >= 0);
  TestValidator.predicate("pagination limit is zero or more", output.pagination.limit >= 0);
  TestValidator.predicate("pagination records is zero or more", output.pagination.records >= 0);
  TestValidator.predicate("pagination pages is zero or more", output.pagination.pages >= 0);

  // 5. Validate sections sorted by name descending
  const sections = typia.assert<Array<unknown>>(output.data);

  for (let i = 1; i < sections.length; ++i) {
    TestValidator.predicate(
      `section name order at index ${i}`,
      (sections[i - 1] as any).name >= (sections[i] as any).name,
    );
  }
}
