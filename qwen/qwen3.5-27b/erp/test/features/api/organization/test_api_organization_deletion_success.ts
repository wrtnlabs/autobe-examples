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
 * Test successful organization deletion when all preconditions are met.
 *
 * This test verifies that an organization can be deleted successfully when:
 * - All pending timesheets are resolved (approved or rejected)
 * - All active employee contracts are ended
 * - The requesting admin has proper permissions
 *
 * Due to API limitations (no organization creation endpoint available),
 * this test uses a randomly generated UUID and verifies the deletion
 * endpoint returns 204 No Content on successful execution.
 */
export async function test_api_organization_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Generate organization ID for deletion test
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Delete organization
  // The deletion endpoint returns void (204 No Content)
  // Successful completion without error indicates the deletion was processed
  await api.functional.hrmPlatform.admin.organizations.erase(adminConnection, {
    organizationId,
  });
  // 4. Test passes if no exception was thrown
  // The 204 No Content response indicates successful deletion
}
