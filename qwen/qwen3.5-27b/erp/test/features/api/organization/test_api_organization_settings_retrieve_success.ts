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
 * Test that an authenticated admin can successfully retrieve organization settings.
 *
 * This test validates that:
 * 1. An admin can authenticate and access organization settings
 * 2. The settings response contains all required fields with valid data
 * 3. Currency, timezone, and fiscal year settings are properly formatted
 *
 * **NOTE**: This test requires a valid organization ID to exist in the system.
 * In a real test environment, ensure organizations are pre-seeded or use a
 * test organization ID provided by the test infrastructure.
 */
export async function test_api_organization_settings_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Use a valid organization ID
  // NOTE: In production tests, this should come from test infrastructure
  // or a pre-created organization. For now, we generate a UUID.
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Execute: Retrieve organization settings
  const settings =
    await api.functional.hrmPlatform.admin.organizations.settings.at(
      adminConnection,
      {
        organizationId,
      },
    );
  typia.assert(settings);
  // 4. Validation: Verify all required fields exist and have valid values
  // typia.assert already validates the complete structure, so we only test business logic
  TestValidator.predicate(
    "currency is 3-letter code",
    settings.currency.length === 3,
  );
  TestValidator.predicate(
    "timezone contains region identifier",
    settings.timezone.includes("/"),
  );
  TestValidator.equals(
    "fiscal year start month is valid",
    settings.fiscal_year_start_month >= 1 &&
      settings.fiscal_year_start_month <= 12,
    true,
  );
  TestValidator.predicate("created_at exists", settings.created_at.length > 0);
  TestValidator.predicate("updated_at exists", settings.updated_at.length > 0);
}
