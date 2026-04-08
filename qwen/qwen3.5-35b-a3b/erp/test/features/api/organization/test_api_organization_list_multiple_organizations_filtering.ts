import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization list retrieval with multiple organizations, comprehensive filtering, and edge cases.
 *
 * Validates the complete organization listing workflow including member registration with initial
 * organization creation, second organization creation, and retrieval with various filters,
 * sorting, and pagination options. Ensures that the organization list correctly filters
 * by currency, fiscal_start_month, and search terms, sorts by specified fields, and
 * properly handles pagination metadata. The test also verifies multi-tenancy isolation
 * where each member only sees their own organizations and validates that the owner field
 * correctly references the authenticated member.
 *
 * Special attention is given to verifying that:
 * - Initial organization is created during member registration
 * - Multiple organizations can be created and listed
 * - Filters work independently and in combination
 * - Sorting applies correctly to all supported fields
 * - Pagination metadata is accurate for different page sizes
 * - Multi-tenancy isolation is enforced - no cross-member data exposure
 */
export async function test_api_organization_list_multiple_organizations_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      org_name: "Tech Startup Inc",
      org_currency: "KRW",
      org_fiscal_month: 4,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 2. Create second organization for the same member using authenticated connection
  const secondOrg =
    await api.functional.hrmPlatform.member.organizations.create(
      memberConnection,
      {
        body: {
          name: "Global Solutions",
          description: "Second organization for testing",
          currency: "USD",
          timezone: "UTC",
          fiscal_start_month: 7,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(secondOrg);
  // 3. Retrieve all organizations (default: created_at descending)
  const allOrgsResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(allOrgsResult);
  // Validate: exactly 2 organizations
  TestValidator.equals("organization count", allOrgsResult.data.length, 2);
  // Validate: default sorting by created_at descending (newest first)
  TestValidator.equals(
    "first organization is newest",
    allOrgsResult.data[0].name,
    secondOrg.name,
  );
  TestValidator.equals(
    "second organization is oldest",
    allOrgsResult.data[1].name,
    "Tech Startup Inc",
  );
  // Validate: pagination metadata
  TestValidator.equals("total records", allOrgsResult.pagination.records, 2);
  TestValidator.equals("total pages", allOrgsResult.pagination.pages, 1);
  // 4. Test currency filtering (KRW)
  const krwFilterResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { currency: "KRW" } },
    );
  typia.assert(krwFilterResult);
  TestValidator.equals(
    "KRW organizations count",
    krwFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "KRW organization name",
    krwFilterResult.data[0].name,
    "Tech Startup Inc",
  );
  TestValidator.equals(
    "KRW organization currency",
    krwFilterResult.data[0].currency,
    "KRW",
  );
  // 5. Test fiscal_start_month filtering (7)
  const fiscal7Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { fiscal_start_month: 7 } },
    );
  typia.assert(fiscal7Result);
  TestValidator.equals(
    "fiscal month 7 organizations count",
    fiscal7Result.data.length,
    1,
  );
  TestValidator.equals(
    "fiscal month 7 organization name",
    fiscal7Result.data[0].name,
    "Global Solutions",
  );
  // 6. Test combined filters (USD + fiscal_start_month 7)
  const combinedFilterResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { currency: "USD", fiscal_start_month: 7 } },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter result count",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter organization name",
    combinedFilterResult.data[0].name,
    "Global Solutions",
  );
  // 7. Test search with non-matching name
  const nonMatchingSearchResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { search: "Nonexistent Organization" } },
    );
  typia.assert(nonMatchingSearchResult);
  TestValidator.equals(
    "non-matching search count",
    nonMatchingSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search pages",
    nonMatchingSearchResult.pagination.pages,
    0,
  );
  // 8. Test sorting by name ascending
  const nameAscResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { sort: "name_asc" } },
    );
  typia.assert(nameAscResult);
  TestValidator.equals("name ascending count", nameAscResult.data.length, 2);
  TestValidator.notEquals(
    "organizations sorted by name",
    nameAscResult.data[0].name,
    nameAscResult.data[1].name,
  );
  // Verify alphabetical order: Global Solutions < Tech Startup Inc
  const namesInOrder = nameAscResult.data.map((o) => o.name);
  const sortedNames = [...namesInOrder].sort();
  TestValidator.equals("name ascending order", namesInOrder, sortedNames);
  // 9. Test sorting by created_at ascending
  const createdAscResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { sort: "created_at_asc" } },
    );
  typia.assert(createdAscResult);
  TestValidator.equals(
    "created_at ascending count",
    createdAscResult.data.length,
    2,
  );
  TestValidator.equals(
    "first organization is oldest (created_at_asc)",
    createdAscResult.data[0].name,
    "Tech Startup Inc",
  );
  TestValidator.equals(
    "last organization is newest (created_at_asc)",
    createdAscResult.data[1].name,
    "Global Solutions",
  );
  // 10. Test pagination with limit=1
  const limit1Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { limit: 1 } },
    );
  typia.assert(limit1Result);
  TestValidator.equals("limit=1 page size", limit1Result.pagination.limit, 1);
  TestValidator.equals("limit=1 records per page", limit1Result.data.length, 1);
  TestValidator.equals("limit=1 total pages", limit1Result.pagination.pages, 2);
  // 11. Test page=2 with limit=1
  const page2Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: { page: 2, limit: 1 } },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page=2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page=2 records", page2Result.data.length, 1);
  TestValidator.equals(
    "page=2 organization is oldest",
    page2Result.data[0].name,
    "Tech Startup Inc",
  );
  // 12. Verify data isolation - all organizations belong to authenticated member
  const allOrgsCheck =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(allOrgsCheck);
  for (const org of allOrgsCheck.data) {
    TestValidator.equals(
      `owner ID matches member`,
      org.owner.id,
      memberJoinResult.member.id,
    );
  }
  // 13. Verify owner field contains correct member details
  const firstOrgOwner = allOrgsCheck.data[0].owner;
  TestValidator.equals(
    "owner email matches",
    firstOrgOwner.email,
    memberJoinResult.email,
  );
  TestValidator.equals("owner is_active", firstOrgOwner.is_active, true);
}
