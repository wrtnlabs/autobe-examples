import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Guest user accesses section list without authentication
  const output: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(output);
  // Validate pagination metadata structure
  TestValidator.predicate("pagination exists", output.pagination !== undefined);
  TestValidator.predicate(
    "current page is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // Validate pagination calculation: pages = Math.ceil(records / limit)
  const expectedPages =
    output.pagination.limit === 0
      ? 0
      : Math.ceil(output.pagination.records / output.pagination.limit);
  TestValidator.equals(
    "pagination pages calculation",
    output.pagination.pages,
    expectedPages,
  );
  // Validate data array exists and is an array
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Validate data count matches pagination records
  TestValidator.equals(
    "data count matches records",
    output.data.length,
    output.pagination.records,
  );
  // Validate each section has required fields (typia.assert already validates types)
  for (const section of output.data) {
    // Section must have a name (business logic requirement)
    TestValidator.predicate("section has name", section.name.length > 0);
    // Creator must have required fields
    TestValidator.predicate(
      "creator has display_name",
      section.creator.display_name.length > 0,
    );
    TestValidator.predicate(
      "creator has grade",
      section.creator.grade.length > 0,
    );
  }
  // Validate default pagination parameters were applied
  // When no body parameters provided, should use defaults (page 1, limit 20)
  TestValidator.predicate("default page is 1", output.pagination.current === 1);
  TestValidator.predicate(
    "default limit is 20",
    output.pagination.limit === 20,
  );
}
