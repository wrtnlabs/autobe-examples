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

export async function test_api_section_list_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Create an actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate by setting a mock Authorization header (required for all authenticated users)
  // According to the scenario, any authenticated user can access this endpoint
  userConnection.headers = {
    Authorization: `Bearer mocked-auth-token-for-test`,
  };
  // Call the API endpoint to retrieve the paginated list of sections
  const sectionList: IPageIEconomicDiscussionSection.ISummary =
    await api.functional.economicDiscussion.sections.index(userConnection);
  // Validate the response structure and type safety with typia.assert() (complete validation)
  typia.assert(sectionList);
  // Verify pagination properties
  TestValidator.equals(
    "pagination current page is 1",
    sectionList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    sectionList.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sectionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sectionList.pagination.pages >= 0,
  );
  // Verify data array is not empty (system has at least 3 sections: Politics, Economy, Current Affairs)
  TestValidator.predicate(
    "data array is not empty",
    sectionList.data.length > 0,
  );
  // Note: No additional validation of section properties is required after typia.assert()
  // because typia.assert() fully validates the structure and types.
}
