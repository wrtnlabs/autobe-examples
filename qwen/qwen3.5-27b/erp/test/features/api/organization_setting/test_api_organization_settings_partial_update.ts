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
 * Test partial update of organization settings where only a subset of fields is provided.
 * An authenticated admin should be able to update just one or two fields without affecting the others.
 * The test verifies that partial updates work correctly for currency, timezone, and fiscal_year_start_month.
 */
export async function test_api_organization_settings_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Generate a test organization ID (in real scenario, this would come from organization creation)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test Case 1: Update only currency
  const originalSettings =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: {
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_year_start_month: 1,
        } satisfies IHrmPlatformOrganizationSetting.IUpdate,
      },
    );
  typia.assert(originalSettings);
  const afterCurrencyUpdate =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: {
          currency: "EUR",
        } satisfies IHrmPlatformOrganizationSetting.IUpdate,
      },
    );
  typia.assert(afterCurrencyUpdate);
  TestValidator.equals("currency updated", afterCurrencyUpdate.currency, "EUR");
  TestValidator.equals(
    "timezone unchanged",
    afterCurrencyUpdate.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "fiscal_year_start_month unchanged",
    afterCurrencyUpdate.fiscal_year_start_month,
    1,
  );
  // 4. Test Case 2: Update only timezone
  const afterTimezoneUpdate =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: {
          timezone: "America/New_York",
        } satisfies IHrmPlatformOrganizationSetting.IUpdate,
      },
    );
  typia.assert(afterTimezoneUpdate);
  TestValidator.equals(
    "currency unchanged",
    afterTimezoneUpdate.currency,
    "EUR",
  );
  TestValidator.equals(
    "timezone updated",
    afterTimezoneUpdate.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "fiscal_year_start_month unchanged",
    afterTimezoneUpdate.fiscal_year_start_month,
    1,
  );
  // 5. Test Case 3: Update only fiscal_year_start_month
  const afterFiscalYearUpdate =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: {
          fiscal_year_start_month: 7,
        } satisfies IHrmPlatformOrganizationSetting.IUpdate,
      },
    );
  typia.assert(afterFiscalYearUpdate);
  TestValidator.equals(
    "currency unchanged",
    afterFiscalYearUpdate.currency,
    "EUR",
  );
  TestValidator.equals(
    "timezone unchanged",
    afterFiscalYearUpdate.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "fiscal_year_start_month updated",
    afterFiscalYearUpdate.fiscal_year_start_month,
    7,
  );
  // 6. Test Case 4: Update multiple fields at once
  const afterMultiUpdate =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: {
          currency: "KRW",
          fiscal_year_start_month: 4,
        } satisfies IHrmPlatformOrganizationSetting.IUpdate,
      },
    );
  typia.assert(afterMultiUpdate);
  TestValidator.equals("currency updated", afterMultiUpdate.currency, "KRW");
  TestValidator.equals(
    "timezone unchanged",
    afterMultiUpdate.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "fiscal_year_start_month updated",
    afterMultiUpdate.fiscal_year_start_month,
    4,
  );
  // 7. Verify updated_at timestamp changes with each update
  TestValidator.notEquals(
    "updated_at changed after currency update",
    originalSettings.updated_at,
    afterCurrencyUpdate.updated_at,
  );
  TestValidator.notEquals(
    "updated_at changed after timezone update",
    afterCurrencyUpdate.updated_at,
    afterTimezoneUpdate.updated_at,
  );
  TestValidator.notEquals(
    "updated_at changed after fiscal year update",
    afterTimezoneUpdate.updated_at,
    afterFiscalYearUpdate.updated_at,
  );
  TestValidator.notEquals(
    "updated_at changed after multi update",
    afterFiscalYearUpdate.updated_at,
    afterMultiUpdate.updated_at,
  );
}
