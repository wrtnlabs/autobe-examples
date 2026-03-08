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

export async function test_api_section_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination (page=1, limit=20)
  const defaultResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate("has sections data", defaultResponse.data.length > 0);
  TestValidator.predicate(
    "data length <= limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );
  // Test 2: Custom pagination with smaller page size
  const customResponse = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(customResponse);
  TestValidator.equals(
    "custom page is 2",
    customResponse.pagination.current,
    2,
  );
  TestValidator.equals("custom limit is 5", customResponse.pagination.limit, 5);
  TestValidator.predicate(
    "custom page has data",
    customResponse.data.length > 0,
  );
  TestValidator.predicate(
    "custom data length <= limit",
    customResponse.data.length <= customResponse.pagination.limit,
  );
  // Test 3: Verify sections are ordered by creation time (newest first)
  if (defaultResponse.data.length >= 2) {
    const firstSection = defaultResponse.data[0];
    const secondSection = defaultResponse.data[1];
    TestValidator.predicate(
      "sections ordered by creation (newest first)",
      new Date(firstSection.created_at) >= new Date(secondSection.created_at),
    );
  }
  // Test 4: Verify each section has required fields
  for (const section of defaultResponse.data) {
    typia.assert(section);
    TestValidator.equals("section has id", typeof section.id, "string");
    TestValidator.equals("section has name", typeof section.name, "string");
    TestValidator.equals(
      "section has description",
      typeof section.description,
      "string",
    );
    TestValidator.equals(
      "section has created_at",
      typeof section.created_at,
      "string",
    );
    TestValidator.equals(
      "section has updated_at",
      typeof section.updated_at,
      "string",
    );
    TestValidator.equals(
      "section has article_count",
      typeof section.article_count,
      "number",
    );
    TestValidator.predicate(
      "article_count is non-negative",
      section.article_count >= 0,
    );
  }
  // Test 5: Verify pagination calculations
  const { pagination, data } = defaultResponse;
  TestValidator.predicate(
    "records >= data.length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pages calculation correct",
    pagination.pages === Math.ceil(pagination.records / pagination.limit) ||
      (pagination.records === 0 && pagination.pages === 0),
  );
}
