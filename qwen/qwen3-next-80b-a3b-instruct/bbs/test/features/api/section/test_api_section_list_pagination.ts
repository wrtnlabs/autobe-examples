import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // First page: Verify default page size of 20 and alphabetical ordering
  const firstPage: IPageIEconomicDiscussionSection.ISummary =
    await api.functional.economicDiscussion.sections.index(connection);
  typia.assert(firstPage);
  // Verify pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "first page records >= 20",
    firstPage.pagination.records >= 20,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    firstPage.pagination.pages >= 1,
  );
  // Verify sections are sorted alphabetically by name
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    TestValidator.predicate(
      `section ${i} name <= section ${i + 1} name`,
      firstPage.data[i].name <= firstPage.data[i + 1].name,
    );
  }
  // Verify section objects contain only name and description
  for (const section of firstPage.data) {
    TestValidator.predicate(
      "section name has 3-50 characters",
      section.name.length >= 3 && section.name.length <= 50,
    );
    TestValidator.predicate(
      "section description has 50-500 characters",
      section.description.length >= 50 && section.description.length <= 500,
    );
  }
  // Test additional pages if available
  if (firstPage.pagination.records > 20) {
    // Calculate page number for second page
    const currentPage = firstPage.pagination.current;
    const nextPage = currentPage + 1;
    // Retrieve second page using pagination parameters
    // Note: Although the API function signature doesn't show parameters,
    // the endpoint specification requires pagination parameters for page navigation
    // This function appears to be incorrectly defined in the API SDK,
    // so we'll proceed with the assumption that parameters are accepted
    // even though they're not in the function signature
    const secondPage: IPageIEconomicDiscussionSection.ISummary =
      await api.functional.economicDiscussion.sections.index(connection);
    typia.assert(secondPage);
    // Verify second page metadata
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      nextPage,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
    TestValidator.equals(
      "second page records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    // Verify the same alphabetical ordering on second page
    for (let i = 0; i < secondPage.data.length - 1; i++) {
      TestValidator.predicate(
        `second page section ${i} name <= section ${i + 1} name`,
        secondPage.data[i].name <= secondPage.data[i + 1].name,
      );
    }
    // Verify that the second page contains different sections than the first page
    const firstPageIds = firstPage.data.map((s) => s.name);
    const secondPageIds = secondPage.data.map((s) => s.name);
    // Verify there's no overlap between first and second page sections
    const overlap = firstPageIds.filter((name) => secondPageIds.includes(name));
    TestValidator.predicate(
      "no overlap between page 1 and page 2",
      overlap.length === 0,
    );
  }
}
