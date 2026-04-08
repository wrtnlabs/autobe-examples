import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_listing_default_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create projects with different statuses (store names for later validation)
  const activeName = RandomGenerator.paragraph({ sentences: 2 });
  const archivedName = RandomGenerator.paragraph({ sentences: 2 });
  const completedName = RandomGenerator.paragraph({ sentences: 2 });
  await api.functional.erpHrm.admin.projects.create(adminConnection, {
    body: {
      name: activeName,
      color: "#4A90E2",
      status: "active",
    } satisfies IErpHrmProject.ICreate,
  });
  await api.functional.erpHrm.admin.projects.create(adminConnection, {
    body: {
      name: archivedName,
      color: "#FF5733",
      status: "archived",
    } satisfies IErpHrmProject.ICreate,
  });
  await api.functional.erpHrm.admin.projects.create(adminConnection, {
    body: {
      name: completedName,
      color: "#28A745",
      status: "completed",
    } satisfies IErpHrmProject.ICreate,
  });
  // 3. Query project list without status filter (should default to active)
  const projectListResponse = await api.functional.erpHrm.admin.projects.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(projectListResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination exists",
    projectListResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array exists",
    projectListResponse.data !== null,
    true,
  );
  TestValidator.predicate(
    "has records",
    projectListResponse.pagination.records >= 1,
  );
  // 5. Validate that only active projects are returned (by name and color)
  const activeProjectInList = projectListResponse.data.find(
    (p) => p.name === activeName && p.color === "#4A90E2",
  );
  const archivedProjectInList = projectListResponse.data.find(
    (p) => p.name === archivedName && p.color === "#FF5733",
  );
  const completedProjectInList = projectListResponse.data.find(
    (p) => p.name === completedName && p.color === "#28A745",
  );
  TestValidator.equals(
    "active project is in list",
    activeProjectInList !== undefined,
    true,
  );
  TestValidator.equals(
    "archived project is NOT in list",
    archivedProjectInList !== undefined,
    false,
  );
  TestValidator.equals(
    "completed project is NOT in list",
    completedProjectInList !== undefined,
    false,
  );
  // 6. Validate all returned projects have status "active" and totalTimelogsCount
  for (const project of projectListResponse.data) {
    TestValidator.equals("project status is active", project.status, "active");
    TestValidator.predicate(
      "totalTimelogsCount is non-negative",
      project.totalTimelogsCount >= 0,
    );
    TestValidator.predicate(
      "has valid id",
      /^[0-9a-f-]{36}$/i.test(project.id),
    );
  }
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    projectListResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    projectListResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is valid",
    projectListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    projectListResponse.pagination.pages >= 0,
  );
}
