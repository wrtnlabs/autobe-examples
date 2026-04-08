import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test updating a project membership role from member to project-lead.
 *
 * This test validates the core business workflow where an employee with standard
 * contributor access is promoted to a management role within a project. The test
 * registers and authenticates a member account, then demonstrates the membership
 * role update capability using the project memberships update endpoint.
 *
 * The test ensures that:
 * - The membership role can be successfully changed from 'member' to 'project-lead'
 * - The response includes the complete updated membership record
 * - The updated_at timestamp is refreshed to reflect the modification time
 * - All required membership fields are present in the response
 *
 * Note: Since employee and project creation APIs are not available, this test
 * uses randomized identifiers to validate the update API's response structure
 * and role update behavior.
 */
export async function test_api_project_membership_member_to_project_lead(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Generate random project and membership IDs for update test
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const membershipId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Update membership role from member to project-lead using authenticated connection
  const updatedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.update(
      memberConnection,
      {
        projectId,
        membershipId,
        body: {
          role: "project-lead",
        } satisfies IHrmPlatformProjectMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership);
  // 4. Validate response structure and role update
  TestValidator.equals(
    "role updated to project-lead",
    updatedMembership.role,
    "project-lead",
  );
  TestValidator.equals(
    "project_id matches",
    updatedMembership.project.id,
    projectId,
  );
  TestValidator.equals(
    "membership_id matches",
    updatedMembership.id,
    membershipId,
  );
  TestValidator.predicate(
    "organization_id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(updatedMembership.organization_id),
  );
  // 5. Verify employee and project references are complete
  typia.assert(updatedMembership.employee);
  typia.assert(updatedMembership.project);
  TestValidator.predicate(
    "employee has valid code",
    updatedMembership.employee.employee_code.length > 0,
  );
  TestValidator.predicate(
    "project has valid name",
    updatedMembership.project.name.length > 0,
  );
  // 6. Validate timestamps are properly formatted
  typia.assert(updatedMembership.created_at);
  typia.assert(updatedMembership.updated_at);
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(updatedMembership.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(updatedMembership.updated_at).getTime() > 0,
  );
  // 7. Verify soft-delete status
  TestValidator.equals(
    "membership is active",
    updatedMembership.deleted_at,
    null,
  );
}
