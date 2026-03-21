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

export async function test_api_project_list_all_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create multiple projects using the generation utility
  const projects = await ArrayUtil.asyncRepeat(3, async () => {
    const project = await generate_random_erp_hrm_member_projects_create(
      memberConnection,
      {},
    );
    typia.assert(project);
    return project;
  });
  // 3. Call PATCH /erpHrm/member/projects with empty request body
  const response = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validations
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "pagination has current property",
    "current" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has limit property",
    "limit" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has records property",
    "records" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has pages property",
    "pages" in response.pagination,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "contains created projects",
    response.data.length >= projects.length,
  );
  // Verify each project has required fields
  for (const project of response.data) {
    TestValidator.predicate("project has id", project.id !== undefined);
    TestValidator.predicate("project has name", project.name !== undefined);
    TestValidator.predicate("project has color", project.color !== undefined);
    TestValidator.predicate("project has status", project.status !== undefined);
    TestValidator.predicate(
      "project has created_at",
      project.created_at !== undefined,
    );
    TestValidator.predicate(
      "project has organization",
      project.organization !== undefined,
    );
  }
  // Verify organization context with owner information
  for (const project of response.data) {
    TestValidator.predicate(
      "organization has id",
      project.organization.id !== undefined,
    );
    TestValidator.predicate(
      "organization has name",
      project.organization.name !== undefined,
    );
    TestValidator.predicate(
      "organization has owner",
      project.organization.owner !== undefined,
    );
  }
  // Verify ordering by created_at descending
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const next = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "projects ordered by created_at descending",
      current >= next,
    );
  }
}
