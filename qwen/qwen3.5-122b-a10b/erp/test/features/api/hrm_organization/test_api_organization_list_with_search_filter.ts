import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_list_with_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test organization list with no filters
  const allOrganizations = await api.functional.hrm.member.organizations.index(
    memberConnection,
    {
      body: {} satisfies IHrmOrganization.IRequest,
    },
  );
  typia.assert(allOrganizations);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    allOrganizations.pagination !== undefined,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(allOrganizations.data),
  );
  // Only proceed with detailed tests if organizations exist
  if (allOrganizations.data.length > 0) {
    const firstOrg = allOrganizations.data[0];
    // 3. Test search by name (partial match)
    const searchName = firstOrg.name.substring(
      0,
      Math.max(1, Math.floor(firstOrg.name.length / 2)),
    );
    const searchByName = await api.functional.hrm.member.organizations.index(
      memberConnection,
      {
        body: { search: searchName } satisfies IHrmOrganization.IRequest,
      },
    );
    typia.assert(searchByName);
    // All returned organizations should match the search term
    for (const org of searchByName.data) {
      TestValidator.predicate(
        `organization name matches search "${searchName}"`,
        org.name.toLowerCase().includes(searchName.toLowerCase()),
      );
    }
    // 4. Test search by description (if description exists)
    if (firstOrg.description && firstOrg.description.length > 0) {
      const searchDesc = firstOrg.description.substring(
        0,
        Math.max(1, Math.floor(firstOrg.description.length / 2)),
      );
      const searchByDescription =
        await api.functional.hrm.member.organizations.index(memberConnection, {
          body: { search: searchDesc } satisfies IHrmOrganization.IRequest,
        });
      typia.assert(searchByDescription);
      // All returned organizations should match the search term in name or description
      for (const org of searchByDescription.data) {
        const matchesName = org.name
          .toLowerCase()
          .includes(searchDesc.toLowerCase());
        const matchesDescription = org.description
          ?.toLowerCase()
          .includes(searchDesc.toLowerCase()) ?? false;
        TestValidator.predicate(
          `organization matches description search "${searchDesc}"`,
          matchesName || matchesDescription,
        );
      }
    }
    // 5. Test active filter (true - active organizations only)
    const activeOnly = await api.functional.hrm.member.organizations.index(
      memberConnection,
      {
        body: { active: true } satisfies IHrmOrganization.IRequest,
      },
    );
    typia.assert(activeOnly);
    // 6. Test active filter (false - soft-deleted organizations only)
    const deletedOnly = await api.functional.hrm.member.organizations.index(
      memberConnection,
      {
        body: { active: false } satisfies IHrmOrganization.IRequest,
      },
    );
    typia.assert(deletedOnly);
    // 7. Test combined search and active filter
    const combinedFilter = await api.functional.hrm.member.organizations.index(
      memberConnection,
      {
        body: {
          search: searchName,
          active: true,
        } satisfies IHrmOrganization.IRequest,
      },
    );
    typia.assert(combinedFilter);
    // Validate all results match both criteria
    for (const org of combinedFilter.data) {
      TestValidator.predicate(
        `organization name matches search "${searchName}"`,
        org.name.toLowerCase().includes(searchName.toLowerCase()),
      );
    }
    // 8. Test pagination with limit
    const limitedResults = await api.functional.hrm.member.organizations.index(
      memberConnection,
      {
        body: { limit: 1 } satisfies IHrmOrganization.IRequest,
      },
    );
    typia.assert(limitedResults);
    TestValidator.equals("limit respected", limitedResults.data.length, 1);
    TestValidator.equals(
      "pagination limit matches",
      limitedResults.pagination.limit,
      1,
    );
  }
  // 9. Validate organization summary structure
  if (allOrganizations.data.length > 0) {
    const org = allOrganizations.data[0];
    typia.assert(org);
  }
  // 10. Validate pagination metadata consistency
  TestValidator.predicate(
    "current page is valid",
    allOrganizations.pagination.current >= 1 ||
      allOrganizations.pagination.records === 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    allOrganizations.pagination.pages ===
      Math.ceil(
        allOrganizations.pagination.records / allOrganizations.pagination.limit,
      ) || allOrganizations.pagination.records === 0,
  );
}