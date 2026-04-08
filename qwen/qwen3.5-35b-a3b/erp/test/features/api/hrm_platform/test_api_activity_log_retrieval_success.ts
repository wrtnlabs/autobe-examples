import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of an activity log entry when the authenticated
 * member has org:manage permission and the activity log belongs to their
 * selected organization.
 *
 * Validates that activity log retrieval works correctly by registering a member,
 * creating a member-specific connection with authorization tokens, and retrieving
 * an activity log entry. Verifies all activity log fields are properly populated
 * with correct types and that the deleted_at field indicates the log is active.
 *
 * 1. Register a new member with email, password, and initial organization using
 *    the authorize_member_join utility function.
 * 2. Create a member-specific connection with the access token for authenticated
 *    API calls.
 * 3. Generate a valid activity log ID using typia.random for retrieval testing.
 * 4. Call GET /hrmPlatform/member/activity-logs/{activityLogId} to retrieve
 *    the activity log.
 * 5. Validate all activity log fields are present and have correct types:
 *    - id: UUID format
 *    - member: ISummary format with id, email, is_active, etc.
 *    - organization: ISummary format with id, name, currency, owner, etc.
 *    - entity_type, entity_id, action_type, action_name: string fields
 *    - extra_data: nullable string or undefined
 *    - created_at, updated_at, deleted_at: date-time format
 * 6. Verify deleted_at is null (activity log is not soft-deleted).
 *
 * Note: Since activity-generating API endpoints are not exposed in the current
 * SDK, this test validates retrieval with a generated activity log ID. In
 * production, the ID would come from an activity-generating operation.
 */
export async function test_api_activity_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResponse);
  // 2. Create member-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: authResponse.token.access,
    },
  };
  // 3. Generate activity log ID and retrieve it
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  const activityLog = await api.functional.hrmPlatform.member.activity_logs.at(
    memberConnection,
    {
      activityLogId,
    },
  );
  typia.assert(activityLog);
  // 4. Validate activity log structure and fields
  TestValidator.equals(
    "activity log id matches",
    activityLog.id,
    activityLogId,
  );
  TestValidator.predicate("member exists", activityLog.member !== null);
  if (activityLog.member !== null) {
    TestValidator.predicate(
      "member has valid id",
      activityLog.member.id !== "",
    );
    TestValidator.predicate(
      "member has valid email",
      typeof activityLog.member.email === "string",
    );
    TestValidator.predicate(
      "member is active",
      activityLog.member.is_active === true,
    );
  }
  TestValidator.predicate(
    "organization exists",
    activityLog.organization.id !== "",
  );
  TestValidator.predicate(
    "organization has name",
    typeof activityLog.organization.name === "string",
  );
  TestValidator.predicate(
    "organization has owner",
    activityLog.organization.owner.id !== "",
  );
  TestValidator.predicate(
    "entity type is string",
    typeof activityLog.entity_type === "string",
  );
  TestValidator.predicate(
    "entity id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activityLog.entity_id,
    ),
  );
  TestValidator.predicate(
    "action type is string",
    typeof activityLog.action_type === "string",
  );
  TestValidator.predicate(
    "action name is string",
    typeof activityLog.action_name === "string",
  );
  // extra_data can be null, undefined, or string
  if (activityLog.extra_data !== null && activityLog.extra_data !== undefined) {
    TestValidator.predicate(
      "extra_data is string",
      typeof activityLog.extra_data === "string",
    );
  }
  TestValidator.predicate(
    "created_at is date-time",
    typeof activityLog.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof activityLog.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    activityLog.deleted_at,
    null,
  );
}
