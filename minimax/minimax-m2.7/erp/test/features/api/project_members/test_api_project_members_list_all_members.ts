import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_members_list_all_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A7AFE" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create first member account
  const memberConnection1: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(member1Auth);
  // 4. Create second member account
  const memberConnection2: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(member2Auth);
  // 5. Assign first member to project with member role
  const member1Project =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          name: RandomGenerator.name(),
          color: "#FF5733" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
          status: "active",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(member1Project);
  // 6. Assign second member to project as project lead
  const member2Project =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          name: RandomGenerator.name(),
          color: "#28B463" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
          status: "active",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(member2Project);
  // 7. Call PATCH /erpHrm/admin/projects/{projectId}/members with empty body to list all members
  const membersResponse =
    await api.functional.erpHrm.admin.projects.members.index(adminConnection, {
      projectId: project.id,
      body: {} satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(membersResponse);
  // Validation: Response should have pagination metadata
  TestValidator.equals(
    "pagination.current should be >= 0",
    membersResponse.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.limit should be >= 0",
    membersResponse.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.records should be >= 0",
    membersResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.pages should be >= 0",
    membersResponse.pagination.pages >= 0,
    true,
  );
  // Validation: Both assigned members should appear in response data
  TestValidator.predicate(
    "Response should contain at least 2 members",
    membersResponse.data.length >= 2,
  );
  // Find member 1 in the list
  const member1InList = membersResponse.data.find(
    (m) => m.id === member1Project.id,
  );
  TestValidator.predicate(
    "First member should be in the list",
    member1InList !== undefined,
  );
  // Find member 2 in the list
  const member2InList = membersResponse.data.find(
    (m) => m.id === member2Project.id,
  );
  TestValidator.predicate(
    "Second member should be in the list",
    member2InList !== undefined,
  );
}
