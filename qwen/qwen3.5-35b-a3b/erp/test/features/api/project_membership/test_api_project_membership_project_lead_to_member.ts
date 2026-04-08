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

export async function test_api_project_membership_project_lead_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_timezone: "UTC",
      org_fiscal_month: 1,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Use member connection for subsequent API calls
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    ...authConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Generate test data using random values since creation APIs are not available
  const employee = typia.random<IHrmPlatformEmployee.ISummary>();
  const project = typia.random<IHrmPlatformProject.ISummary>();
  const initialMembership = typia.random<IHrmPlatformProjectMembership>();
  // Store initial timestamp before update
  const initialUpdatedAt = initialMembership.updated_at;
  // Give time for timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Update membership role from project-lead to member
  const updatedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.update(
      authConnection,
      {
        projectId: project.id,
        membershipId: initialMembership.id,
        body: {
          role: "member",
        } satisfies IHrmPlatformProjectMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership);
  // 4. Validate role update
  TestValidator.equals(
    "role updated to member",
    updatedMembership.role,
    "member",
  );
  TestValidator.notEquals(
    "role changed",
    updatedMembership.role,
    "project-lead",
  );
  // 5. Validate timestamp updated
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    updatedMembership.updated_at !== initialUpdatedAt,
  );
  // 6. Validate membership structure intact
  TestValidator.equals(
    "employee reference intact",
    updatedMembership.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project reference intact",
    updatedMembership.project.id,
    project.id,
  );
  TestValidator.equals(
    "organization context preserved",
    updatedMembership.organization_id,
    initialMembership.organization_id,
  );
  TestValidator.equals(
    "membership not deleted",
    updatedMembership.deleted_at,
    null,
  );
  // 7. Verify employee details preserved (historical work data)
  TestValidator.equals(
    "employee code preserved",
    updatedMembership.employee.employee_code,
    employee.employee_code,
  );
  TestValidator.equals(
    "employee name preserved",
    updatedMembership.employee.display_name,
    employee.display_name,
  );
  TestValidator.equals(
    "employee email preserved",
    updatedMembership.employee.email,
    employee.email,
  );
  TestValidator.equals(
    "employment status preserved",
    updatedMembership.employee.status,
    employee.status,
  );
}
