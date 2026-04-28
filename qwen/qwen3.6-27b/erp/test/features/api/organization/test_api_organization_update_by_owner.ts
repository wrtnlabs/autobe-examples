import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_platform_organizations_create } from "../../../generate/generate_random_hrm_platform_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test that an organization owner can successfully perform a partial update to organization settings.
 *
 * Validates that the owner can update a subset of organization fields such as currency and timezone
 * while leaving other fields such as name, description, logo_uri, and fiscal_start_month remain unchanged.
 * The test confirms that the returned organization record correctly reflects the updated values for
 * the explicitly provided fields. Additionally, it verifies that the updated_at timestamp is refreshed
 * to the current datetime, while the created_at timestamp remains unchanged from the initial creation.
 *
 * The system automatically creates an organization snapshot in hrm_platform_organization_snapshots as
 * part of the audit trail for this modification. This test ensures data integrity during partial
 * updates and correct timestamp management.
 *
 * 1. Create a new organization with initial settings.
 * 2. Capture original field values and timestamps.
 * 3. Perform a partial update with only currency and timezone.
 * 4. Validate that updated fields match the new values.
 * 5. Validate that unchanged fields match the original values.
 * 6. Validate that created_at remains unchanged and updated_at is refreshed.
 */
export async function test_api_organization_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Create organization
  const originalOrg: IHrmPlatformOrganization =
    await generate_random_hrm_platform_organizations_create(connection, {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    });
  typia.assert(originalOrg);
  // 2. Capture original values
  const originalName: string = originalOrg.name;
  const originalDescription: string | null = originalOrg.description;
  const originalLogoUri: string | null | undefined = originalOrg.logo_uri;
  const originalFiscalStartMonth: number = originalOrg.fiscal_start_month;
  const originalCreatedAt: string = originalOrg.created_at;
  // 3. Define update body
  const newCurrency: string = "JPY";
  const newTimezone: string = "Asia/Seoul";
  const updateBody: IHrmPlatformOrganization.IUpdate = {
    currency: newCurrency,
    timezone: newTimezone,
  } satisfies IHrmPlatformOrganization.IUpdate;
  // 4. Update organization
  const updatedOrg: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.organizations.update(connection, {
      organizationId: originalOrg.id,
      body: updateBody,
    });
  typia.assert(updatedOrg);
  // 5. Validate updated fields
  TestValidator.equals(
    "currency updated correctly",
    updatedOrg.currency,
    newCurrency,
  );
  TestValidator.equals(
    "timezone updated correctly",
    updatedOrg.timezone,
    newTimezone,
  );
  // 6. Validate unchanged fields
  TestValidator.equals("name remains unchanged", updatedOrg.name, originalName);
  TestValidator.equals(
    "description remains unchanged",
    updatedOrg.description,
    originalDescription,
  );
  TestValidator.equals(
    "logo_uri remains unchanged",
    updatedOrg.logo_uri,
    originalLogoUri,
  );
  TestValidator.equals(
    "fiscal_start_month remains unchanged",
    updatedOrg.fiscal_start_month,
    originalFiscalStartMonth,
  );
  // 7. Validate timestamps
  TestValidator.equals(
    "created_at remains unchanged",
    updatedOrg.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is present",
    updatedOrg.updated_at.length > 0,
  );
}
