import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test organization listing with pagination functionality.
 *
 * 1. Fetch first page of organizations with default parameters
 * 2. Validate response structure and pagination metadata
 * 3. Verify each organization contains required fields
 * 4. Test pagination by fetching subsequent pages
 * 5. Validate consistent pagination behavior
 */
export async function test_api_organization_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch first page with default parameters
  const page1 = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {} satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(page1);
  // 2. Validate pagination metadata structure
  TestValidator.predicate("pagination exists", page1.pagination !== undefined);
  TestValidator.predicate("current page is 1", page1.pagination.current === 1);
  TestValidator.predicate("limit is positive", page1.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages count is valid", page1.pagination.pages >= 0);
  // 3. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(page1.data));
  // 4. Validate each organization in the response
  await ArrayUtil.asyncForEach(page1.data, async (org, index) => {
    // Validate required fields exist
    TestValidator.predicate(
      `organization[${index}] has id`,
      org.id !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] has name`,
      org.name !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] has owner`,
      org.owner !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] has setting`,
      org.setting !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] has logo`,
      org.logo !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] has created_at`,
      org.created_at !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] has updated_at`,
      org.updated_at !== undefined,
    );
    // Validate owner structure
    TestValidator.predicate(
      `organization[${index}] owner has id`,
      org.owner.id !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] owner has email`,
      org.owner.email !== undefined,
    );
    // Validate setting structure
    TestValidator.predicate(
      `organization[${index}] setting has currency`,
      org.setting.currency !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] setting has timezone`,
      org.setting.timezone !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] setting has fiscal_year_start_month`,
      org.setting.fiscal_year_start_month !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] setting fiscal_year_start_month in range 1-12`,
      org.setting.fiscal_year_start_month >= 1 &&
        org.setting.fiscal_year_start_month <= 12,
    );
    // Validate logo structure
    TestValidator.predicate(
      `organization[${index}] logo has id`,
      org.logo.id !== undefined,
    );
    TestValidator.predicate(
      `organization[${index}] logo has image_url`,
      org.logo.image_url !== undefined,
    );
  });
  // 5. Test pagination with explicit page parameter
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.hrmPlatform.organizations.index(
      connection,
      {
        body: {
          page: 2,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
    typia.assert(page2);
    // Validate page 2 metadata
    TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
    TestValidator.predicate(
      "page 2 has data",
      page2.pagination.records >= page1.pagination.records,
    );
    // Validate no duplicate organizations between pages
    const page1Ids = page1.data.map((org) => org.id);
    const page2Ids = page2.data.map((org) => org.id);
    const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
    TestValidator.equals(
      "no duplicate organizations between pages",
      duplicates.length,
      0,
    );
  }
  // 6. Test pagination with limit parameter
  const limitedPage = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(limitedPage);
  TestValidator.equals("limit is 5", limitedPage.pagination.limit, 5);
  TestValidator.predicate(
    "data count does not exceed limit",
    limitedPage.data.length <= 5,
  );
  // 7. Test with search parameter
  const searchPage = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        search: "",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(searchPage);
  TestValidator.predicate(
    "search with empty string returns valid response",
    searchPage.pagination.records >= 0,
  );
  // 8. Test with status filter
  const activePage = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        status: "active",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(activePage);
  TestValidator.predicate(
    "active status filter returns valid response",
    activePage.pagination.records >= 0,
  );
  // 9. Test sorting by created_at
  const sortedByCreated = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(sortedByCreated);
  TestValidator.predicate(
    "sorting by created_at desc returns valid response",
    sortedByCreated.pagination.records >= 0,
  );
  // 10. Test sorting by name
  const sortedByName = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(sortedByName);
  TestValidator.predicate(
    "sorting by name asc returns valid response",
    sortedByName.pagination.records >= 0,
  );
}
