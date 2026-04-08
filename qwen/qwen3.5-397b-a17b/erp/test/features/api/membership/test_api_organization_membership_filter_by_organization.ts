import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationMembership";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationMembership";
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
 * Test filtering organization memberships by specific organization ID.
 *
 * Validates the complete membership filtering workflow including member authentication, multiple organization creation, and organization-based membership filtering. Ensures that the membership list correctly filters by organization ID and returns only matching records.
 *
 * Special attention is given to verifying that the hrm_platform_organization_id filter parameter works correctly, pagination structure is maintained, and non-matching organization memberships are properly excluded from filtered results.
 *
 * 1. Member authenticates successfully using authorize_member_join utility.
 * 2. Member creates first organization to establish initial membership record.
 * 3. Member creates second organization to enable filtering test with multiple memberships.
 * 4. Queries all memberships without filter to verify multiple records exist.
 * 5. Queries memberships filtered by first organization ID.
 * 6. Validates filtered response contains only memberships for first organization.
 * 7. Queries memberships filtered by second organization ID.
 * 8. Validates filtered response contains only memberships for second organization.
 * 9. Verifies pagination structure is correct in all filtered responses.
 */
export async function test_api_organization_membership_filter_by_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create first organization
  const organization1 =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization1);
  // 3. Create second organization
  const organization2 =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "EUR",
          timezone: "Europe/London",
          fiscal_start_month: 4,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization2);
  // 4. Query all memberships without filter to verify multiple records
  const allMemberships =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          limit: 10,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(allMemberships);
  // 5. Validate we have at least 2 memberships (one for each organization)
  TestValidator.predicate(
    "has multiple memberships",
    () => allMemberships.data.length >= 2,
  );
  // 6. Filter memberships by first organization ID
  const filteredByOrg1 =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          hrm_platform_organization_id: organization1.id,
          limit: 10,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(filteredByOrg1);
  // 7. Validate filtered results contain only first organization memberships
  TestValidator.predicate("all filtered memberships match org1", () =>
    filteredByOrg1.data.every(
      (membership) => membership.organization.id === organization1.id,
    ),
  );
  // 8. Filter memberships by second organization ID
  const filteredByOrg2 =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          hrm_platform_organization_id: organization2.id,
          limit: 10,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(filteredByOrg2);
  // 9. Validate filtered results contain only second organization memberships
  TestValidator.predicate("all filtered memberships match org2", () =>
    filteredByOrg2.data.every(
      (membership) => membership.organization.id === organization2.id,
    ),
  );
  // 10. Validate pagination structure is correct
  TestValidator.equals(
    "pagination current page",
    filteredByOrg1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    () => filteredByOrg1.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    filteredByOrg1.pagination.records,
    filteredByOrg1.data.length,
  );
  TestValidator.predicate(
    "pagination pages count",
    () => filteredByOrg1.pagination.pages >= 0,
  );
  // 11. Validate that filtered results exclude non-matching organizations
  TestValidator.predicate(
    "org1 filter excludes org2",
    () =>
      !filteredByOrg1.data.some(
        (membership) => membership.organization.id === organization2.id,
      ),
  );
  TestValidator.predicate(
    "org2 filter excludes org1",
    () =>
      !filteredByOrg2.data.some(
        (membership) => membership.organization.id === organization1.id,
      ),
  );
}
