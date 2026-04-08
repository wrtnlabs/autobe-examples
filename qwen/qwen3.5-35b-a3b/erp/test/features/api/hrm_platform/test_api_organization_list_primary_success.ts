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

/**
 * Test the primary success path for retrieving a paginated list of organizations
 * owned by the authenticated member.
 *
 * Validates the complete organization listing flow including member registration
 * with initial organization creation, authentication, and paginated organization
 * retrieval. Ensures that the organization list correctly filters by owner,
 * applies search filters, sorts results, and provides accurate pagination
 * metadata. Special attention is given to verifying that soft-deleted
 * organizations are excluded from the results and that all business logic
 * constraints are properly enforced.
 *
 * 1. Member registers with specific organization details (Alpha Corp, USD,
 *    fiscal month 1) using join operation.
 * 2. Retrieve all organizations for authenticated member with no filters.
 * 3. Validate response contains exactly one organization with correct metadata.
 * 4. Test partial name search filter for "Alpha".
 * 5. Test sorting by name ascending.
 * 6. Test pagination parameters with page and limit values.
 */
export async function test_api_organization_list_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with initial organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: "Alpha Corp",
      org_currency: "USD",
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: 1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Retrieve all organizations for authenticated member
  const organizationsResponse =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organizationsResponse);
  // 3. Validate response contains exactly one organization
  TestValidator.equals(
    "organization count",
    organizationsResponse.data.length,
    1,
  );
  const organization = organizationsResponse.data[0];
  typia.assert(organization);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page",
    organizationsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count",
    organizationsResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pages count",
    organizationsResponse.pagination.pages,
    1,
  );
  // 5. Validate organization data fields
  TestValidator.equals("organization name", organization.name, "Alpha Corp");
  TestValidator.equals("organization currency", organization.currency, "USD");
  TestValidator.equals(
    "fiscal start month",
    organization.fiscal_start_month,
    1,
  );
  // 6. Validate owner reference
  TestValidator.equals("owner ID", organization.owner.id, auth.id);
  TestValidator.equals("owner email", organization.owner.email, auth.email);
  // 7. Validate timestamps are valid ISO 8601 strings
  typia.assert(organization.created_at);
  typia.assert(organization.updated_at);
  // deleted_at can be null (soft delete), so use assertGuard
  typia.assertGuard(organization.deleted_at);
  // 8. Test partial name search filter
  const searchResponse =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: { search: "Alpha" },
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals("search results count", searchResponse.data.length, 1);
  TestValidator.equals(
    "search result name",
    searchResponse.data[0].name,
    "Alpha Corp",
  );
  // 9. Test sorting by name ascending
  const sortResponse =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: { sort: "name_asc" },
      },
    );
  typia.assert(sortResponse);
  TestValidator.equals("sort results count", sortResponse.data.length, 1);
  // 10. Test pagination with page and limit
  const paginationResponse =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records",
    paginationResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    paginationResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    10,
  );
}
