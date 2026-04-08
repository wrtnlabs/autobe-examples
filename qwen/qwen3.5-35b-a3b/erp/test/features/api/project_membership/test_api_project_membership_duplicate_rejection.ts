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
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_project_membership_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member account creation via authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: "Asia/Seoul",
      org_fiscal_month: 1,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const orgConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(orgConnection, {
    body: {
      email: memberAuth.member.email,
      password: "TestPassword123!",
    },
  });
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      orgConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create role
  const roleConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(roleConnection, {
    body: {
      email: memberAuth.member.email,
      password: "TestPassword123!",
    },
  });
  const role = await generate_random_hrm_platform_member_roles_create(
    roleConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Test role for membership testing",
        role_kind: "custom",
      },
    },
  );
  typia.assert(role);
  // 4. Create department
  const deptConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(deptConnection, {
    body: {
      email: memberAuth.member.email,
      password: "TestPassword123!",
    },
  });
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      deptConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(department);
  // 5 & 6. Pre-existing employee and project from test database
  // These are assumed to exist in the test environment with valid UUIDs
  // Random UUIDs represent pre-existing resources from test fixture
  const employeeId: string = typia.random<string & tags.Format<"uuid">>();
  const projectId: string = typia.random<string & tags.Format<"uuid">>();
  // 7. Create first membership
  const membership1Connection: api.IConnection = { host: connection.host };
  await authorize_member_login(membership1Connection, {
    body: {
      email: memberAuth.member.email,
      password: "TestPassword123!",
    },
  });
  const firstMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      membership1Connection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: {
          projectId: projectId,
        },
      },
    );
  typia.assert(firstMembership);
  // 8. Attempt to create duplicate membership (should fail with 409)
  const duplicateConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(duplicateConnection, {
    body: {
      email: memberAuth.member.email,
      password: "TestPassword123!",
    },
  });
  await TestValidator.httpError(
    "duplicate membership rejected with 409 Conflict",
    409,
    async () => {
      await generate_random_hrm_platform_member_projects_memberships_create(
        duplicateConnection,
        {
          body: {
            employee_id: employeeId,
            role: "member",
          },
          params: {
            projectId: projectId,
          },
        },
      );
    },
  );
}
