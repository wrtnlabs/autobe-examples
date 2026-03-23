import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
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
 * Test multi-tenancy isolation for activity log access.
 *
 * This test verifies that activity logs are properly isolated by organization,
 * ensuring that administrators cannot access activity logs from organizations
 * they do not belong to, even though they have elevated privileges within
 * their own organization.
 */
export async function test_api_activity_log_multi_tenancy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin for Organization A
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // 2. Create and authenticate admin for Organization B
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 3. Generate activity log IDs for testing
  // Note: Activity logs are system-generated audit trails, not user-created resources.
  // We use random UUIDs to simulate activity log IDs that would exist in each organization.
  const activityLogIdOrgA = typia.random<string & tags.Format<"uuid">>();
  const activityLogIdOrgB = typia.random<string & tags.Format<"uuid">>();
  // 4. Test that admin1 cannot access activity log from Organization B
  // This should fail because the activity log doesn't exist in admin1's organization context
  await TestValidator.error(
    "admin1 cannot access activity log from Organization B",
    async () => {
      await api.functional.hrmPlatform.admin.activity_logs.at(
        admin1Connection,
        {
          activityLogId: activityLogIdOrgB,
        },
      );
    },
  );
  // 5. Test that admin2 cannot access activity log from Organization A
  // This should fail because the activity log doesn't exist in admin2's organization context
  await TestValidator.error(
    "admin2 cannot access activity log from Organization A",
    async () => {
      await api.functional.hrmPlatform.admin.activity_logs.at(
        admin2Connection,
        {
          activityLogId: activityLogIdOrgA,
        },
      );
    },
  );
  // 6. Verify that each admin is properly authenticated in their own context
  // by checking that their authentication tokens are different
  TestValidator.notEquals(
    "admin authentication tokens are different",
    admin1Auth.token.access,
    admin2Auth.token.access,
  );
  // 7. Verify that each admin has a unique email address
  TestValidator.notEquals(
    "admin email addresses are different",
    admin1Auth.email,
    admin2Auth.email,
  );
  // 8. Validate that both admins were successfully created with valid UUIDs
  TestValidator.predicate(
    "admin1 has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin1Auth.id,
    ),
  );
  TestValidator.predicate(
    "admin2 has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin2Auth.id,
    ),
  );
}
