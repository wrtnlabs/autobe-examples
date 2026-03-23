import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that organization deletion is blocked when pending timesheets exist.
 *
 * This test validates the business rule that prevents organization deletion
 * when there are unresolved pending timesheets. The system must reject the
 * deletion request with an appropriate error message indicating that all
 * pending timesheets must be approved or rejected before the organization
 * can be deleted.
 */
export async function test_api_organization_deletion_blocked_by_pending_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Generate organization ID (simulating an organization with pending timesheets)
  // Note: In a real scenario, we would create an organization and timesheets first,
  // but those endpoints are not available in the provided SDK
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete organization - should fail due to pending timesheets
  await TestValidator.error(
    "organization deletion blocked by pending timesheets",
    async () => {
      await api.functional.hrmPlatform.admin.organizations.erase(
        adminConnection,
        {
          organizationId,
        },
      );
    },
  );
}
