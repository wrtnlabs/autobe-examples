import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
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
 * Test the business impact of timezone and fiscal year configuration changes on organization operations.
 * Validates that organization settings updates are properly applied and reflected in the system.
 */
export async function test_api_organization_settings_timezone_fiscal_year_impact(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate organization ID (in real scenario, this would be from an existing organization)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Prepare settings update with new timezone and fiscal year configuration
  const settingsUpdate = {
    currency: "USD",
    timezone: "America/New_York",
    fiscal_year_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmPlatformOrganizationSetting.IUpdate;
  // 4. Update organization settings
  const updatedSettings: IHrmPlatformOrganizationSetting =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: settingsUpdate,
      },
    );
  typia.assert(updatedSettings);
  // 5. Validate settings update response
  TestValidator.equals(
    "organizationId matches",
    updatedSettings.id,
    updatedSettings.id,
  );
  TestValidator.equals(
    "currency updated",
    updatedSettings.currency,
    settingsUpdate.currency,
  );
  TestValidator.equals(
    "timezone updated",
    updatedSettings.timezone,
    settingsUpdate.timezone,
  );
  TestValidator.equals(
    "fiscal_year_start_month updated",
    updatedSettings.fiscal_year_start_month,
    settingsUpdate.fiscal_year_start_month,
  );
  // 6. Validate timezone format (IANA timezone identifier)
  TestValidator.predicate(
    "timezone is valid IANA identifier",
    /^[A-Za-z_][A-Za-z0-9_]*(\/ [A-Za-z0-9_]+)*$/.test(
      updatedSettings.timezone,
    ),
  );
  // 7. Validate fiscal year month range
  TestValidator.predicate(
    "fiscal_year_start_month is in valid range",
    updatedSettings.fiscal_year_start_month >= 1 &&
      updatedSettings.fiscal_year_start_month <= 12,
  );
  // 8. Verify timestamps exist and are valid
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(updatedSettings.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(updatedSettings.updated_at)),
  );
  // 9. Verify settings were actually updated (updated_at should be >= created_at)
  TestValidator.predicate(
    "settings were updated",
    new Date(updatedSettings.updated_at) >=
      new Date(updatedSettings.created_at),
  );
  // 10. Test with different timezone configuration
  const secondUpdate = {
    timezone: "Asia/Seoul",
    fiscal_year_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmPlatformOrganizationSetting.IUpdate;
  const secondUpdatedSettings: IHrmPlatformOrganizationSetting =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: secondUpdate,
      },
    );
  typia.assert(secondUpdatedSettings);
  // 11. Validate second update
  TestValidator.equals(
    "timezone changed to Asia/Seoul",
    secondUpdatedSettings.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "fiscal_year_start_month updated",
    secondUpdatedSettings.fiscal_year_start_month,
    secondUpdate.fiscal_year_start_month,
  );
  // 12. Verify currency was preserved (not included in second update)
  TestValidator.equals(
    "currency preserved after partial update",
    secondUpdatedSettings.currency,
    "USD",
  );
  // 13. Test with only fiscal year change
  const fiscalYearOnlyUpdate = {
    fiscal_year_start_month: 1, // January start
  } satisfies IHrmPlatformOrganizationSetting.IUpdate;
  const fiscalYearUpdatedSettings: IHrmPlatformOrganizationSetting =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: fiscalYearOnlyUpdate,
      },
    );
  typia.assert(fiscalYearUpdatedSettings);
  // 14. Validate fiscal year only update
  TestValidator.equals(
    "fiscal_year_start_month set to January",
    fiscalYearUpdatedSettings.fiscal_year_start_month,
    1,
  );
  TestValidator.equals(
    "timezone preserved",
    fiscalYearUpdatedSettings.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "currency preserved",
    fiscalYearUpdatedSettings.currency,
    "USD",
  );
}
