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
 * Test partial organization update scenarios.
 * Verifies that only provided fields are updated while others remain unchanged.
 * Tests independent updates of name, description, currency, timezone, fiscal_year_start_month, and image_url.
 *
 * NOTE: This test requires a pre-existing organization. The organizationId must reference
 * an organization that already exists in the system.
 */
export async function test_api_organization_update_partial_settings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Use a pre-existing organization ID
  // In a real test environment, this would be created beforehand or retrieved from a known source
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. First partial update: Update only name
  const newName = RandomGenerator.name(3);
  const update1Body = {
    name: newName,
  } satisfies IHrmPlatformOrganization.IUpdate;
  const result1 = await api.functional.hrmPlatform.admin.organizations.update(
    adminConnection,
    {
      organizationId,
      body: update1Body,
    },
  );
  typia.assert(result1);
  // Verify name changed
  TestValidator.equals("name updated to new value", result1.name, newName);
  // 4. Second partial update: Update only description to null
  const update2Body = {
    description: null,
  } satisfies IHrmPlatformOrganization.IUpdate;
  const result2 = await api.functional.hrmPlatform.admin.organizations.update(
    adminConnection,
    {
      organizationId,
      body: update2Body,
    },
  );
  typia.assert(result2);
  // Verify description is null
  TestValidator.equals("description set to null", result2.description, null);
  // Verify name still has the updated value
  TestValidator.equals(
    "name preserved from previous update",
    result2.name,
    newName,
  );
  // 5. Third partial update: Update only currency and timezone
  const newCurrency = "EUR";
  const newTimezone = "Asia/Seoul";
  const update3Body = {
    currency: newCurrency,
    timezone: newTimezone,
  } satisfies IHrmPlatformOrganization.IUpdate;
  const result3 = await api.functional.hrmPlatform.admin.organizations.update(
    adminConnection,
    {
      organizationId,
      body: update3Body,
    },
  );
  typia.assert(result3);
  // Verify currency and timezone changed
  TestValidator.equals(
    "currency updated to EUR",
    result3.settings.currency,
    newCurrency,
  );
  TestValidator.equals(
    "timezone updated to Asia/Seoul",
    result3.settings.timezone,
    newTimezone,
  );
  // Verify name still preserved
  TestValidator.equals("name still preserved", result3.name, newName);
  // Verify description still null
  TestValidator.equals("description still null", result3.description, null);
  // 6. Fourth partial update: Update only fiscal_year_start_month
  const newFiscalYearStart = 7 satisfies number as number;
  const update4Body = {
    fiscal_year_start_month: newFiscalYearStart,
  } satisfies IHrmPlatformOrganization.IUpdate;
  const result4 = await api.functional.hrmPlatform.admin.organizations.update(
    adminConnection,
    {
      organizationId,
      body: update4Body,
    },
  );
  typia.assert(result4);
  // Verify fiscal_year_start_month changed
  TestValidator.equals(
    "fiscal_year_start_month updated to July",
    result4.settings.fiscal_year_start_month,
    newFiscalYearStart,
  );
  // Verify currency and timezone still preserved
  TestValidator.equals(
    "currency still preserved",
    result4.settings.currency,
    newCurrency,
  );
  TestValidator.equals(
    "timezone still preserved",
    result4.settings.timezone,
    newTimezone,
  );
  // 7. Fifth partial update: Update only image_url
  const newImageUrl = typia.random<string & tags.Format<"uri">>();
  const update5Body = {
    image_url: newImageUrl,
  } satisfies IHrmPlatformOrganization.IUpdate;
  const result5 = await api.functional.hrmPlatform.admin.organizations.update(
    adminConnection,
    {
      organizationId,
      body: update5Body,
    },
  );
  typia.assert(result5);
  // Verify image_url changed
  TestValidator.equals(
    "image_url updated to new value",
    result5.logo.image_url,
    newImageUrl,
  );
  // Verify all other fields still preserved
  TestValidator.equals("name still preserved", result5.name, newName);
  TestValidator.equals("description still null", result5.description, null);
  TestValidator.equals(
    "currency still preserved",
    result5.settings.currency,
    newCurrency,
  );
  TestValidator.equals(
    "timezone still preserved",
    result5.settings.timezone,
    newTimezone,
  );
  TestValidator.equals(
    "fiscal_year_start_month still preserved",
    result5.settings.fiscal_year_start_month,
    newFiscalYearStart,
  );
  // 8. Final verification: All partial updates preserved correctly
  TestValidator.predicate(
    "organization has valid ID",
    () => result5.id !== undefined,
  );
  TestValidator.predicate("owner exists", () => result5.owner !== undefined);
  TestValidator.predicate(
    "settings exist",
    () => result5.settings !== undefined,
  );
  TestValidator.predicate("logo exists", () => result5.logo !== undefined);
}
