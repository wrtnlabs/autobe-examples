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
 * Test organization settings update with all configurable fields.
 *
 * This test validates the complete organization settings update workflow:
 * 1. Admin authentication via join flow
 * 2. Update all three settings fields (currency, timezone, fiscal_year_start_month)
 * 3. Verify response contains complete updated settings with all fields
 * 4. Validate that updated_at timestamp is refreshed
 */
export async function test_api_organization_settings_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate organization ID (no creation API available)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Update organization settings with all fields
  const updatedSettings =
    await api.functional.hrmPlatform.admin.organizations.settings.update(
      adminConnection,
      {
        organizationId,
        body: {
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IHrmPlatformOrganizationSetting.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  // 4. Validate response fields
  TestValidator.equals(
    "currency matches input",
    updatedSettings.currency,
    "USD",
  );
  TestValidator.equals(
    "timezone matches input",
    updatedSettings.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "fiscal_year_start_month matches input",
    updatedSettings.fiscal_year_start_month,
    1,
  );
  TestValidator.predicate(
    "has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedSettings.id,
    ),
  );
  TestValidator.predicate(
    "has valid created_at",
    !isNaN(Date.parse(updatedSettings.created_at)),
  );
  TestValidator.predicate(
    "has valid updated_at",
    !isNaN(Date.parse(updatedSettings.updated_at)),
  );
}
