import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a single activity log entry by its unique identifier when the member has proper organization management permissions.
 *
 * Validates the complete activity log retrieval flow including member authentication and audit trail access. Ensures that the activity log endpoint returns properly structured data with all required fields including action type, target entity information, organization context, and member actor details.
 *
 * Special attention is given to verifying that the response contains complete audit trail information with proper dot-notation action types, organization summary data, and member identification fields for accountability tracking.
 *
 * 1. Member authenticates via join operation with randomized credentials.
 * 2. Activity log ID is generated as a valid UUID for endpoint testing.
 * 3. Call GET /hrmPlatform/member/activity-logs/{activityLogId} to retrieve the log entry.
 * 4. Validates response structure includes all required fields: id, actionType, targetEntityType, targetEntityId, details, createdAt, organization, member.
 * 5. Verifies actionType follows dot-notation format and timestamps are ISO 8601 formatted.
 */
export async function test_api_activity_log_retrieval_by_organization_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Generate activity log ID for retrieval
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve activity log entry
  const activityLog = await api.functional.hrmPlatform.member.activity_logs.at(
    memberConnection,
    {
      activityLogId,
    },
  );
  typia.assert(activityLog);
  // 4. Validate business logic - actionType follows dot-notation format
  TestValidator.predicate("actionType follows dot-notation", () =>
    activityLog.actionType.includes("."),
  );
}
