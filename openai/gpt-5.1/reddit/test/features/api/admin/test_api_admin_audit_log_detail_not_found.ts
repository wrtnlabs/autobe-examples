import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate not-found and authorization behavior for audit log detail lookup.
 *
 * This E2E test focuses on the negative path of the GET
 * /communityPlatform/adminUser/auditLogs/{auditLogId} endpoint. It ensures
 * that:
 *
 * 1. An adminUser can authenticate and perform privileged operations.
 * 2. The system configuration endpoint can be invoked to simulate platform
 *    activity and (implicitly) initialize audit logging.
 * 3. Requesting audit log details with a random UUID that is extremely unlikely to
 *    exist results in a failure (e.g., 404-style behavior) when called as an
 *    authenticated admin.
 * 4. The same audit log detail endpoint rejects unauthenticated access, enforcing
 *    admin-only protection.
 *
 * High level steps:
 *
 * 1. Join as a new adminUser and assert the authorized context.
 * 2. Create a dummy system configuration row.
 * 3. Generate a random UUID and attempt to fetch the audit log detail as the
 *    authenticated admin, expecting the call to fail.
 * 4. Create an unauthenticated connection copy and attempt the same audit log
 *    detail request, again expecting failure due to missing admin credentials.
 */
export async function test_api_admin_audit_log_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and establish Authorization context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Basic sanity check: token structure looks valid by type
  const token: IAuthorizationToken = adminAuthorized.token;
  typia.assert<IAuthorizationToken>(token);

  // 2. Create a system configuration row to simulate platform activity
  const systemConfigBody = {
    category: "audit",
    config_key: "e2e_not_found_probe",
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(createdConfig);

  // 3. Generate a random UUID that should not correspond to a real audit log
  const randomAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // As an authenticated adminUser, attempting to fetch a non-existent
  // audit log detail should result in an error (e.g., not found).
  await TestValidator.error(
    "non-existent audit log should fail for admin",
    async () => {
      await api.functional.communityPlatform.adminUser.auditLogs.at(
        connection,
        {
          auditLogId: randomAuditLogId,
        },
      );
    },
  );

  // 4. Attempt the same request with an unauthenticated connection to
  // verify that admin-only guard is enforced.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to audit log detail must be rejected",
    async () => {
      await api.functional.communityPlatform.adminUser.auditLogs.at(
        anonymousConnection,
        {
          auditLogId: randomAuditLogId,
        },
      );
    },
  );
}
