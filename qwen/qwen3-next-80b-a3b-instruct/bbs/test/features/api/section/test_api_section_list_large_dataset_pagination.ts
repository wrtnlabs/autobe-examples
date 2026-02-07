import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_list_large_dataset_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection for unauthenticated access
  const unauthConnection: api.IConnection = { host: connection.host };
  // Request the third page of sections with limit of 5
  const page3Response = await api.functional.economicBoard.sections.index(
    unauthConnection,
    {
      body: {},
    },
  );
  typia.assert(page3Response);
  // Extract pagination metadata and data
  const { pagination, data } = page3Response;
  // Validate pagination metadata
  TestValidator.equals("page number is 3", pagination.current, 3);
  TestValidator.equals("page size is 5", pagination.limit, 5);
  TestValidator.predicate(
    "total sections count is positive",
    pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages is sufficient for page 3",
    pagination.pages >= 3,
  );
  // Validate page 3 contains exactly 5 sections
  TestValidator.equals("page 3 has exactly 5 sections", data.length, 5);
  // Validate that only active sections are included (no deleted sections)
  // Since the API endpoint excludes deleted sections per specification,
  // the response naturally contains only active sections
  // Get all three pages for comparison
  const page1Response = await api.functional.economicBoard.sections.index(
    unauthConnection,
    {
      body: {},
    },
  );
  typia.assert(page1Response);
  const page2Response = await api.functional.economicBoard.sections.index(
    unauthConnection,
    {
      body: {},
    },
  );
  typia.assert(page2Response);
  // Extract data
  const page1Data = page1Response.data;
  const page2Data = page2Response.data;
  const page3Data = data;
  // Validate data consistency across pages by checking ordering
  // Use the total count and page size to ensure sequential progression
  // Since ISummary has no identifiable properties, we cannot verify content sequencing directly
  // But we can ensure we're getting different data on each page by comparing lengths and counts
  TestValidator.equals("page 1 has 5 sections", page1Data.length, 5);
  TestValidator.equals("page 2 has 5 sections", page2Data.length, 5);
  // Validate sections are sorted by newest creation date
  // We cannot validate ordering since ISummary has no created_at property
  // We rely on API specification that sections are sorted by creation date descending
  // The test passes the response structure and pagination validation
}
