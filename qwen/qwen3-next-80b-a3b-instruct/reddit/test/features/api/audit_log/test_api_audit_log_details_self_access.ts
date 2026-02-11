import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLogDetail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_audit_log_details_self_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user and obtain authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Use the authenticated connection to retrieve audit log details
  // Note: The system does not expose audit log IDs for users
  // but we assume there is an audit log associated with this authentication
  // We use the member.id as the auditLogId as a direct mapping for test purposes
  const details = await api.functional.redditCommunity.audit_logs.details.index(
    memberConnection,
    {
      auditLogId: member.id,
    },
  );
  typia.assert(details);
  // Validate: Audit log details exist for the user
  TestValidator.equals(
    "Found audit log details",
    details.data.length > 0,
    true,
  );
}
