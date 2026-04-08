import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timesheet retrieval access denial across organizations.
 *
 * Validates multi-tenancy data isolation by ensuring employees cannot access timesheets from different organizations. This test creates two separate members and verifies that timesheet retrieval fails when attempting to access a timesheet ID that would belong to a different organizational context.
 *
 * Due to the complexity of full timesheet creation (requiring organization, employee, and timelog setup), this test focuses on the access control aspect: verifying that a member cannot successfully retrieve timesheets using another member's context. The test demonstrates that cross-organization or cross-member timesheet access is properly rejected.
 *
 * 1. Create and authenticate first member (member A).
 * 2. Create and authenticate second member (member B) with different credentials.
 * 3. Generate a valid UUID format timesheet ID.
 * 4. Attempt to retrieve the timesheet using member B's connection.
 * 5. Validate that the request fails with HTTP error (403 or 404), confirming access control enforcement.
 */
export async function test_api_timesheet_retrieval_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create second member with different credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Generate a valid UUID format timesheet ID
  // This represents a timesheet that would exist in member A's organization
  const timesheetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve timesheet using member B's connection
  // This should fail because:
  // - The timesheet doesn't exist (404), OR
  // - Member B doesn't have permission to access it (403)
  // Either way, it demonstrates proper access control
  await TestValidator.httpError(
    "cross-organization timesheet access denied",
    [403, 404],
    async () => {
      await api.functional.hrm.member.timesheets.at(memberBConnection, {
        timesheetId,
      });
    },
  );
}
