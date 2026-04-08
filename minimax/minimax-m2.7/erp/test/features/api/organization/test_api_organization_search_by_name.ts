import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_organization_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple admin accounts (each creates an organization)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {});
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {});
  typia.assert(admin2);
  // 2. Get all organizations to establish baseline
  const allOrgsResponse = await api.functional.erpHrm.admin.organizations.index(
    admin1Connection,
    {
      body: {} satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(allOrgsResponse);
  // Need at least 2 organizations for meaningful search test
  if (allOrgsResponse.data.length < 2) {
    // Verify endpoint works with empty search
    const emptyResponse = await api.functional.erpHrm.admin.organizations.index(
      admin1Connection,
      {
        body: { search: "nonexistent" } satisfies IErpHrmOrganization.IRequest,
      },
    );
    typia.assert(emptyResponse);
    TestValidator.equals(
      "empty search returns no results",
      emptyResponse.data.length,
      0,
    );
    return;
  }
  // 3. Extract organization names for search testing
  const targetOrg = allOrgsResponse.data[0];
  const targetName = targetOrg.name;
  // Get a partial search term (substring of the name)
  const partialTerm = RandomGenerator.substring(targetName);
  // 4. Test search with partial match
  const searchResponse = await api.functional.erpHrm.admin.organizations.index(
    admin1Connection,
    {
      body: { search: partialTerm } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Verify all returned organizations contain the search term (case-insensitive)
  for (const org of searchResponse.data) {
    TestValidator.predicate(
      `organization name "${org.name}" contains search term "${partialTerm}"`,
      org.name.toLowerCase().includes(partialTerm.toLowerCase()),
    );
  }
  // 5. Test case-insensitive search
  const upperSearchTerm = partialTerm.toUpperCase();
  const upperSearchResponse =
    await api.functional.erpHrm.admin.organizations.index(admin1Connection, {
      body: { search: upperSearchTerm } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(upperSearchResponse);
  // Both searches should return same count for case-insensitive matching
  TestValidator.equals(
    "case-insensitive search returns same count",
    upperSearchResponse.data.length,
    searchResponse.data.length,
  );
  // 6. Test pagination with search applied
  const paginatedSearchResponse =
    await api.functional.erpHrm.admin.organizations.index(admin1Connection, {
      body: {
        search: partialTerm,
        page: 1,
        limit: 1,
      } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(paginatedSearchResponse);
  TestValidator.equals(
    "pagination limit is respected",
    paginatedSearchResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "has valid pagination records",
    paginatedSearchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pagination pages",
    paginatedSearchResponse.pagination.pages >= 0,
  );
  // 7. Test search with no matches
  const noMatchResponse = await api.functional.erpHrm.admin.organizations.index(
    admin1Connection,
    {
      body: {
        search: "zzz_nonexistent_zzz_12345",
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no matches returns empty array",
    noMatchResponse.data.length,
    0,
  );
}
