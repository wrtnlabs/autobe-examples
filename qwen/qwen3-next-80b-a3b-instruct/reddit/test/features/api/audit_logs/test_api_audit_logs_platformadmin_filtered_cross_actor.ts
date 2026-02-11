import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLog";
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

export async function test_api_audit_logs_platformadmin_filtered_cross_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  const adminResult =
    await api.functional.redditCommunity.auth.platformadmin.join(
      adminConnection,
      { body: adminCredentials },
    );
  typia.assert(adminResult);
  // Update adminConnection with auth token
  adminConnection.headers = { Authorization: adminResult.token.access };
  // 2. Query audit logs with filter for 'login' action
  const request: IRedditCommunityUserAuditLog.IRequest = {
    action: "login",
  };
  const output = await api.functional.redditCommunity.audit_logs.index(
    adminConnection,
    { body: request },
  );
  typia.assert(output);
  // 3. Validate response structure
  TestValidator.equals(
    "page pagination present",
    typeof output.pagination,
    "object",
  );
  TestValidator.predicate(
    "at least one audit log entry returned",
    () => output.data.length >= 1,
  );
  // 4. Validate that logs contain all four actor types
  let foundMember = false;
  let foundOwner = false;
  let foundModerator = false;
  let foundAdmin = false;
  for (const log of output.data) {
    TestValidator.equals("action must be 'login'", log.action, "login");
    if (log.member !== undefined) foundMember = true;
    if (log.owner !== null) foundOwner = true;
    if (log.moderator !== null) foundModerator = true;
    if (log.admin !== null) foundAdmin = true;
  }
  // Validate that we detected at least one of each actor type
  // The system must have created at least one of each actor type to function
  // We don't need to create them - we only test they appear in the audit logs
  TestValidator.equals("found member actor", foundMember, true);
  TestValidator.equals("found owner actor", foundOwner, true);
  TestValidator.equals("found moderator actor", foundModerator, true);
  TestValidator.equals("found admin actor", foundAdmin, true);
}
