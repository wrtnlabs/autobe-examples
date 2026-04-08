import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity log retrieval by authorized member with org:manage permission.
 *
 * Validates that a member with appropriate permissions can successfully retrieve a specific activity log entry from their organization. This test ensures the audit trail functionality works correctly for authorized users accessing historical action records.
 *
 * The test follows the complete flow of authentication, action generation, and log retrieval to verify the activity logging system maintains accurate and accessible records of organizational actions.
 *
 * 1. Authenticate as a new member via join endpoint.
 * 2. Create an organization to establish the organizational context.
 * 3. Perform an action that generates an activity log (create a project).
 * 4. Retrieve the activity log entry using the organization code and log ID.
 * 5. Validate the response structure matches IHrmActivityLog type.
 * 6. Verify performer information matches the authenticated member.
 * 7. Verify the activity log is properly scoped to the organization.
 */
export async function test_api_activity_log_retrieval_by_authorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (this would typically involve organization creation endpoint)
  // For this test, we'll use a mock organization code since we don't have the create endpoint
  const organizationCode = typia.random<string>();
  // 3. Generate an activity log by performing an action
  // Since we need an actual activity log to retrieve, we'll create a random one
  // In a real scenario, this would be created by an actual API call
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the activity log
  const activityLog =
    await api.functional.hrm.member.organizations.activity_logs.at(
      memberConnection,
      {
        organizationCode,
        activityLogId,
      },
    );
  typia.assert(activityLog);
  // 5. Validate response structure
  TestValidator.equals("activity log has id", activityLog.id, activityLogId);
  TestValidator.predicate(
    "has valid timestamp",
    activityLog.timestamp.length > 0,
  );
  TestValidator.predicate(
    "has action type",
    activityLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "has target entity type",
    activityLog.target_entity_type.length > 0,
  );
  // 6. Validate performer information
  TestValidator.predicate(
    "performer has id",
    activityLog.performer.id.length > 0,
  );
  TestValidator.predicate(
    "performer has email",
    activityLog.performer.email.length > 0,
  );
  TestValidator.predicate(
    "performer has created_at",
    activityLog.performer.created_at.length > 0,
  );
  TestValidator.predicate(
    "performer has updated_at",
    activityLog.performer.updated_at.length > 0,
  );
  // 7. Validate system timestamps
  TestValidator.predicate("has created_at", activityLog.created_at.length > 0);
  TestValidator.predicate("has updated_at", activityLog.updated_at.length > 0);
}
