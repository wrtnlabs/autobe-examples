import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_audit_log_access_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection and join
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_platform_admin_join(joinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joinResponse);
  // Login with the same credentials to generate audit log
  const adminConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_platform_admin_login(adminConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(loginResponse);
  // Use the admin connection to retrieve an audit log
  // Platform admin has universal access, so even if the UUID is random, if an audit log exists we get it.
  // We are testing against the live system.
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLogEntry = await api.functional.redditCommunity.audit_logs.at(
    adminConnection,
    { auditLogId },
  );
  typia.assert(auditLogEntry);
}
