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

export async function test_api_section_list_custom_sorting_order(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve sections with name sorting in descending order (Z-A)
  const nameDescResult = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sort: "name",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(nameDescResult);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    nameDescResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    nameDescResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    nameDescResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    nameDescResult.pagination.pages >= 0,
  );
  // Verify all sections have required fields
  for (const section of nameDescResult.data) {
    typia.assert(section);
    TestValidator.predicate("section has id", section.id !== undefined);
    TestValidator.predicate("section has name", section.name !== undefined);
    TestValidator.predicate(
      "section has created_at",
      section.created_at !== undefined,
    );
    TestValidator.predicate(
      "section has creator",
      section.creator !== undefined,
    );
    TestValidator.predicate(
      "section has article_count",
      section.article_count !== undefined,
    );
  }
  // Verify name sorting order (descending - Z-A)
  if (nameDescResult.data.length > 1) {
    for (let i = 0; i < nameDescResult.data.length - 1; i++) {
      const current = nameDescResult.data[i];
      const next = nameDescResult.data[i + 1];
      TestValidator.predicate(
        `section ${i} name >= section ${i + 1} name (descending)`,
        current.name >= next.name,
      );
    }
  }
  // Test 2: Retrieve sections with created_at sorting in ascending order (oldest first)
  const createdAtAscResult =
    await api.functional.discussionBoard.sections.index(connection, {
      body: {
        sort: "created_at",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(createdAtAscResult);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    createdAtAscResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    createdAtAscResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    createdAtAscResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    createdAtAscResult.pagination.pages >= 0,
  );
  // Verify all sections have required fields
  for (const section of createdAtAscResult.data) {
    typia.assert(section);
    TestValidator.predicate("section has id", section.id !== undefined);
    TestValidator.predicate("section has name", section.name !== undefined);
    TestValidator.predicate(
      "section has created_at",
      section.created_at !== undefined,
    );
    TestValidator.predicate(
      "section has creator",
      section.creator !== undefined,
    );
    TestValidator.predicate(
      "section has article_count",
      section.article_count !== undefined,
    );
  }
  // Verify created_at sorting order (ascending - oldest first)
  if (createdAtAscResult.data.length > 1) {
    for (let i = 0; i < createdAtAscResult.data.length - 1; i++) {
      const current = createdAtAscResult.data[i];
      const next = createdAtAscResult.data[i + 1];
      TestValidator.predicate(
        `section ${i} created_at <= section ${i + 1} created_at (ascending)`,
        current.created_at <= next.created_at,
      );
    }
  }
  // Test 3: Verify consistent ordering across multiple requests with same parameters
  const repeatResult1 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sort: "name",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(repeatResult1);
  const repeatResult2 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        sort: "name",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(repeatResult2);
  // Verify same ordering is maintained
  if (repeatResult1.data.length === repeatResult2.data.length) {
    for (let i = 0; i < repeatResult1.data.length; i++) {
      TestValidator.equals(
        `section ${i} id matches across requests`,
        repeatResult1.data[i].id,
        repeatResult2.data[i].id,
      );
    }
  }
}
