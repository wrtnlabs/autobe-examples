import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can successfully retrieve a specific activity log type by its dot-notation code.
 *
 * Validates the complete workflow for looking up a system-defined activity log type after member registration. The endpoint is protected and requires member-level authentication, which is obtained through the member join flow.
 *
 * The test verifies that the returned activity log type record matches the requested code and that the record is active (soft-delete timestamp is null), confirming that system-seeded reference data is correctly served through the member API.
 *
 * 1. Register a new member account via POST /hrmTimeTracking/auth/member/join, which authenticates and sets the Authorization header on the connection.
 * 2. Call GET /hrmTimeTracking/member/activity-log-types/{activityLogTypeCode} with a known code.
 * 3. Validate the full response structure using typia.assert.
 * 4. Confirm the returned code matches the requested code.
 * 5. Confirm the record is active by verifying deleted_at is null.
 */
export async function test_api_activity_log_type_lookup_by_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  // 2. Lookup activity log type by code
  const activityLogType =
    await api.functional.hrmTimeTracking.member.activity_log_types.at(
      memberConnection,
      {
        activityLogTypeCode: "employee.invited",
      },
    );
  typia.assert(activityLogType);
  // 3. Validate
  TestValidator.equals(
    "returned code matches requested",
    activityLogType.code,
    "employee.invited",
  );
  TestValidator.predicate(
    "record is active (deleted_at is null)",
    activityLogType.deleted_at === null,
  );
}
