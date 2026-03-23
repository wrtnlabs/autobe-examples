import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test organization update with all configuration settings.
 *
 * PREREQUISITE: An organization must exist before running this test.
 * The organizationId should be provided by test setup or fixture.
 *
 * Test flow:
 * 1. Admin authenticates to the system
 * 2. Admin updates organization with all settings: name, description, currency, timezone, fiscal year, logo
 * 3. Validate the updated organization response contains all updated fields
 * 4. Verify settings and logo are properly joined in the response
 */
export async function test_api_organization_update_all_settings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@organization-update-test.com",
      password: "SecureAdmin123!",
      href: "https://hrm.example.com/admin/join",
      referrer: "https://hrm.example.com",
      ip: "192.168.1.100",
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Use pre-existing organization ID (must be created by test setup)
  // In a real test suite, this would come from a fixture or prior test
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update data with all settings
  const updateBody = {
    name: "Updated Test Organization",
    description: "This organization has been updated with new settings",
    currency: "KRW",
    timezone: "Asia/Seoul",
    fiscal_year_start_month: 3 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    image_url: "https://cdn.example.com/logos/updated-org-logo.png",
  } satisfies IHrmPlatformOrganization.IUpdate;
  // 4. Update organization with all settings
  const updatedOrganization =
    await api.functional.hrmPlatform.admin.organizations.update(
      adminConnection,
      {
        organizationId,
        body: updateBody,
      },
    );
  typia.assert(updatedOrganization);
  // 5. Validate organization name is updated
  TestValidator.equals(
    "organization name updated",
    updatedOrganization.name,
    updateBody.name,
  );
  // 6. Validate description is updated
  TestValidator.equals(
    "organization description updated",
    updatedOrganization.description,
    updateBody.description,
  );
  // 7. Validate currency is updated in settings
  TestValidator.equals(
    "currency updated to KRW",
    updatedOrganization.settings.currency,
    updateBody.currency,
  );
  // 8. Validate timezone is updated in settings
  TestValidator.equals(
    "timezone updated to Asia/Seoul",
    updatedOrganization.settings.timezone,
    updateBody.timezone,
  );
  // 9. Validate fiscal year start month is updated in settings
  TestValidator.equals(
    "fiscal year start month updated",
    updatedOrganization.settings.fiscal_year_start_month,
    updateBody.fiscal_year_start_month,
  );
  // 10. Validate logo image URL is updated
  TestValidator.equals(
    "logo image URL updated",
    updatedOrganization.logo.image_url,
    updateBody.image_url,
  );
  // 11. Validate updated_at timestamp exists
  TestValidator.predicate(
    "updated_at timestamp is present",
    updatedOrganization.updated_at !== null &&
      updatedOrganization.updated_at.length > 0,
  );
  // 12. Validate organization ID matches
  TestValidator.equals(
    "organization ID matches",
    updatedOrganization.id,
    organizationId,
  );
  // 13. Validate owner is present
  TestValidator.predicate(
    "owner is present",
    updatedOrganization.owner.id !== null &&
      updatedOrganization.owner.email !== null,
  );
  // 14. Validate settings ID exists
  TestValidator.predicate(
    "settings ID exists",
    updatedOrganization.settings.id !== null &&
      updatedOrganization.settings.id.length > 0,
  );
  // 15. Validate logo ID exists
  TestValidator.predicate(
    "logo ID exists",
    updatedOrganization.logo.id !== null &&
      updatedOrganization.logo.id.length > 0,
  );
}
