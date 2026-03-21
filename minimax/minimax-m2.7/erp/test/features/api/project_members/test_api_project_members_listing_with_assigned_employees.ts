import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_members_listing_with_assigned_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project using generation utility
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Call the target endpoint to list project members
  // Note: Without employee creation endpoints, project has no members assigned
  // This still validates the endpoint returns proper paginated structure
  const membersResponse =
    await api.functional.erpHrm.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(membersResponse);
  // 4. Validate pagination structure
  TestValidator.equals(
    "has pagination info",
    !!membersResponse.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    typeof membersResponse.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    typeof membersResponse.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    typeof membersResponse.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has total pages",
    typeof membersResponse.pagination.pages === "number",
    true,
  );
  // 5. Validate data array structure
  TestValidator.equals(
    "has data array",
    Array.isArray(membersResponse.data),
    true,
  );
  // 6. Validate each member item structure if members exist
  for (const member of membersResponse.data) {
    typia.assert(member);
    TestValidator.predicate(
      "member has valid id",
      typeof member.id === "string" && member.id.length > 0,
    );
    TestValidator.predicate(
      "member has valid name",
      typeof member.name === "string" && member.name.length > 0,
    );
    TestValidator.predicate(
      "member has valid color",
      typeof member.color === "string" && member.color.length > 0,
    );
    TestValidator.predicate(
      "member has valid status",
      typeof member.status === "string" && member.status.length > 0,
    );
    TestValidator.equals(
      "member has organization info",
      !!member.organization,
      true,
    );
  }
  // 7. Verify project matches expected values
  const listedProject = membersResponse.data.find((p) => p.id === project.id);
  TestValidator.equals(
    "project info matches",
    listedProject?.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    listedProject?.color,
    project.color,
  );
  TestValidator.equals(
    "project status matches",
    listedProject?.status,
    project.status,
  );
}
