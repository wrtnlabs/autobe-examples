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

export async function test_api_project_members_listing_filtered_by_role(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create a project to test member listing
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Test listing project members with default pagination (page 1, no limit)
  const membersDefault =
    await api.functional.erpHrm.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(membersDefault);
  // Validate pagination structure exists
  TestValidator.equals(
    "pagination.current",
    membersDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(membersDefault.data),
    true,
  );
  // Test listing project members with custom pagination (page 2, limit 5)
  const membersPaginated =
    await api.functional.erpHrm.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(membersPaginated);
  // Validate custom pagination values
  TestValidator.equals(
    "pagination.current",
    membersPaginated.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination.limit",
    membersPaginated.pagination.limit,
    5,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(membersPaginated.data),
    true,
  );
  // Test listing project members filtered by project status
  const membersByStatus =
    await api.functional.erpHrm.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: project.status,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(membersByStatus);
  TestValidator.equals(
    "data is array",
    Array.isArray(membersByStatus.data),
    true,
  );
}
