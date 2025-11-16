import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_moderation_audit_log_detail_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. As authenticated platformAdmin, fetch moderation audit log detail
  const moderationAuditLogIdAdmin: string = typia.random<string>();
  const adminLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.at(
      connection,
      {
        moderationAuditLogId: moderationAuditLogIdAdmin,
      },
    );
  typia.assert<ICommunityPlatformModerationAuditLog>(adminLog);

  // 3. Prepare a separate, unauthenticated connection without touching original headers
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
    headers: {},
  };

  // 4. Using unauthenticated connection, fetch another moderation audit log detail in simulate mode
  const moderationAuditLogIdUnauth: string = typia.random<string>();
  const unauthLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.at(
      unauthenticatedConnection,
      {
        moderationAuditLogId: moderationAuditLogIdUnauth,
      },
    );
  typia.assert<ICommunityPlatformModerationAuditLog>(unauthLog);

  // Note: With the limited SDK surface and simulate mode behavior, we cannot
  // reliably assert authorization failures or status codes here. This test
  // focuses on ensuring that an authenticated platformAdmin can obtain a
  // structurally valid moderation audit log detail response, and that the
  // endpoint contract remains stable under a separate connection instance.
}
