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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_audit_logs_member_own_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Use the member connection for audit log requests (token is automatically set)
  // Now make the audit log request with no filters - should return only member's own logs
  const auditLogs = await api.functional.redditCommunity.audit_logs.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(auditLogs);
  // 3. Validate response structure and content
  // Pagination metadata
  TestValidator.equals(
    "pagination current page",
    auditLogs.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", auditLogs.pagination.limit, 20); // default limit
  TestValidator.predicate(
    "pagination records >= 0",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    auditLogs.pagination.pages >= 0,
  );
  // Verify all logs belong to the member
  for (const log of auditLogs.data) {
    TestValidator.notEquals("log member is not null", log.member, undefined);
    TestValidator.equals(
      "log member id matches authenticated member",
      log.member?.id,
      joinResponse.id,
    );
    TestValidator.equals("log owner is null", log.owner, null);
    TestValidator.equals("log moderator is null", log.moderator, null);
    TestValidator.equals("log admin is null", log.admin, null);
  }
}
