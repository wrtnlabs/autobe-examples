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

export async function test_api_section_discovery_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Call the endpoint without authentication (guest access)
  const response = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination structure
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Validate pagination consistency (business logic)
  if (pagination.records > 0 && pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination pages calculated correctly",
      pagination.pages,
      expectedPages,
    );
  }
  // Validate sections are sorted by sequence in ascending order (business logic)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `section sequence order at index ${i}`,
        response.data[i - 1].sequence <= response.data[i].sequence,
      );
    }
  }
}
