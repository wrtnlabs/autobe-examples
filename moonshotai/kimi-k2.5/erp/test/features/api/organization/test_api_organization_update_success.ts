import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test the complete organization update workflow.
 *
 * SCENARIO: Member creates an organization and updates its configuration
 * 1. Authenticate as a new member via POST /erpHrm/auth/member/join
 * 2. Create a new organization via POST /erpHrm/member/organizations
 * 3. Update the organization via PUT /erpHrm/member/organizations/{organizationId}
 * 4. Verify updated fields and preserved fields
 * 5. Validate timestamps and owner information
 */
export async function test_api_organization_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new organization
  const originalOrganization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(originalOrganization);
  // Store original values for comparison
  const originalCurrency = originalOrganization.currency;
  const originalTimezone = originalOrganization.timezone;
  const originalFiscalYearStartMonth =
    originalOrganization.fiscal_year_start_month;
  const originalCreatedAt = originalOrganization.created_at;
  const originalOwnerId = originalOrganization.owner.id;
  // 3. Update the organization with new name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedOrganization =
    await api.functional.erpHrm.member.organizations.update(memberConnection, {
      organizationId: originalOrganization.id,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IErpHrmOrganization.IUpdate,
    });
  typia.assert(updatedOrganization);
  // 4. Verify the response contains the updated organization
  TestValidator.equals(
    "organization id unchanged",
    updatedOrganization.id,
    originalOrganization.id,
  );
  TestValidator.equals("name updated", updatedOrganization.name, newName);
  TestValidator.equals(
    "description updated",
    updatedOrganization.description,
    newDescription,
  );
  // 5. Verify unchanged fields are preserved
  TestValidator.equals(
    "currency preserved",
    updatedOrganization.currency,
    originalCurrency,
  );
  TestValidator.equals(
    "timezone preserved",
    updatedOrganization.timezone,
    originalTimezone,
  );
  TestValidator.equals(
    "fiscal_year_start_month preserved",
    updatedOrganization.fiscal_year_start_month,
    originalFiscalYearStartMonth,
  );
  // 6. Verify timestamps
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedOrganization.updated_at) > new Date(originalCreatedAt),
  );
  // 7. Verify owner information remains correct
  TestValidator.equals(
    "owner id unchanged",
    updatedOrganization.owner.id,
    originalOwnerId,
  );
}
