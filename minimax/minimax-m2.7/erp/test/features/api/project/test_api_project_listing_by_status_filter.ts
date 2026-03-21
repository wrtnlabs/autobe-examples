import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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

export async function test_api_project_listing_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access project listing endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test listing projects filtered by status='active'
  const activeProjectsResponse =
    await api.functional.erpHrm.admin.projects.index(adminConnection, {
      body: {
        status: "active",
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(activeProjectsResponse);
  // 3. Validate pagination metadata exists and is valid
  TestValidator.equals(
    "pagination.current is valid",
    activeProjectsResponse.pagination.current !== null,
    true,
  );
  TestValidator.equals(
    "pagination.limit is valid",
    activeProjectsResponse.pagination.limit !== null,
    true,
  );
  TestValidator.equals(
    "pagination.records is valid",
    activeProjectsResponse.pagination.records !== null,
    true,
  );
  TestValidator.equals(
    "pagination.pages is valid",
    activeProjectsResponse.pagination.pages !== null,
    true,
  );
  // 4. Validate each project has required fields and correct status
  for (const project of activeProjectsResponse.data) {
    TestValidator.equals("project has id", project.id !== null, true);
    TestValidator.equals("project has name", project.name !== null, true);
    TestValidator.equals("project has color", project.color !== null, true);
    TestValidator.equals("project has status", project.status !== null, true);
    TestValidator.equals("project status is active", project.status, "active");
    TestValidator.equals(
      "project has organization",
      project.organization !== null,
      true,
    );
  }
  // 5. Test combining status filter with name filter
  const searchName = RandomGenerator.name();
  const combinedFilterResponse =
    await api.functional.erpHrm.admin.projects.index(adminConnection, {
      body: {
        status: "active",
        name: typia.random<string & tags.Format<"regex">>(),
        page: 1,
        limit: 10,
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(combinedFilterResponse);
  // 6. Validate combined filter response structure
  TestValidator.equals(
    "combined filter has pagination",
    combinedFilterResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "combined filter has data array",
    Array.isArray(combinedFilterResponse.data),
    true,
  );
  // 7. Test status='archived' filter
  const archivedProjectsResponse =
    await api.functional.erpHrm.admin.projects.index(adminConnection, {
      body: {
        status: "archived",
        page: 1,
        limit: 10,
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(archivedProjectsResponse);
  // 8. Validate archived projects have correct status
  for (const project of archivedProjectsResponse.data) {
    TestValidator.equals(
      "archived project status is archived",
      project.status,
      "archived",
    );
  }
  // 9. Test status='completed' filter
  const completedProjectsResponse =
    await api.functional.erpHrm.admin.projects.index(adminConnection, {
      body: {
        status: "completed",
        page: 1,
        limit: 10,
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(completedProjectsResponse);
  // 10. Validate completed projects have correct status
  for (const project of completedProjectsResponse.data) {
    TestValidator.equals(
      "completed project status is completed",
      project.status,
      "completed",
    );
  }
}
