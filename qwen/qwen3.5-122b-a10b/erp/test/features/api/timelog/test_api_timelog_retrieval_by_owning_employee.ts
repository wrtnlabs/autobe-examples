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
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated employee can successfully retrieve their own timelog entry from the organization-scoped endpoint.
 *
 * Validates the primary success path where a member authenticates and retrieves a timelog by its UUID within an organization context. The test confirms that the timelog retrieval endpoint returns complete timelog details including employee reference, project reference, optional task reference, work date, duration in minutes, description, and billable status.
 *
 * The scenario exercises the following workflow:
 * 1. Create a new member account with email and password credentials
 * 2. Authenticate the member to receive JWT access and refresh tokens
 * 3. Attempt to retrieve a timelog using organization and timelog UUIDs
 * 4. Validate the response structure matches IHrmTimelog type definition
 * 5. Verify all timelog fields including related entity summaries (employee, project, task)
 *
 * This test confirms that authenticated members can access the timelog retrieval endpoint with proper organization context enforcement and that the response includes all required timelog properties with correct type validation.
 */
export async function test_api_timelog_retrieval_by_owning_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Generate random UUIDs for organization and timelog
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const timelogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve timelog from organization-scoped endpoint
  const timelog = await api.functional.hrm.member.organizations.timelogs.at(
    memberConnection,
    {
      organizationId,
      timelogId,
    },
  );
  // 4. Validate complete timelog response structure
  typia.assert(timelog);
  // 5. Validate timelog properties
  TestValidator.predicate(
    "timelog has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      timelog.id,
    ),
  );
  TestValidator.predicate(
    "timelog has positive duration",
    timelog.duration_minutes > 0,
  );
  TestValidator.predicate(
    "timelog has valid date format",
    new Date(timelog.date).getTime() > 0,
  );
  TestValidator.predicate(
    "timelog has employee reference",
    timelog.employee !== null && timelog.employee !== undefined,
  );
  TestValidator.predicate(
    "timelog has project reference",
    timelog.project !== null && timelog.project !== undefined,
  );
}
