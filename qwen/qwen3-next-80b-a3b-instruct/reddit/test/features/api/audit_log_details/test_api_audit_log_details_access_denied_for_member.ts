import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLogDetail";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import type { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_audit_log_details_access_denied_for_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Join as a regular member (no admin/moderator privileges)
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // Step 2: Attempt to access audit log details with valid request body
  const auditRequest: IRedditCommunityUserAuditLogDetail.IRequest = {
    key: "ip_address",
    value: "192.168.1.1",
    created_at_from: new Date().toISOString(),
    created_at_to: new Date(new Date().getTime() + 86400000).toISOString(),
    page: 1,
    limit: 20,
  };
  // Step 3: Call the endpoint - expecting 403 Forbidden
  await TestValidator.httpError(
    "member should be denied access to audit log details",
    403,
    async () => {
      await api.functional.redditCommunity.audit_log_details.index(
        memberConnection,
        { body: auditRequest },
      );
    },
  );
}
