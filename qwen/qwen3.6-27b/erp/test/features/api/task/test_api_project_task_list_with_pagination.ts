import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Verify project task listing returns correctly paginated results.
 *
 * Validates the PATCH /hrmPlatform/member/projects/{projectId}/tasks endpoint returns a properly structured paginated response matching IPageIHrmPlatformTask.ISummary. Tests confirm the pagination object contains accurate metadata for current page, limit per page, total records, and calculated total pages.
 *
 * Empty project scenario confirms that a project with zero tasks returns an empty data array alongside pagination metadata showing records=0 and pages=0, verifying correct edge-case handling.
 *
 * 1. Member authenticates via join, creating account with default organization.
 * 2. Project is created within member's organization context.
 * 3. Task list endpoint is called with explicit pagination parameters page=1, limit=5.
 * 4. Response structure is type-validated against IPageIHrmPlatformTask.ISummary.
 * 5. Pagination metadata fields are verified for correctness.
 */
export async function test_api_project_task_list_with_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. List tasks with pagination parameters
  const request = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IHrmPlatformTask.IRequest;
  const response = await api.functional.hrmPlatform.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: request,
    },
  );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", response.pagination.limit, 5);
  TestValidator.equals(
    "pagination records is 0 for empty project",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for empty project",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("data array is empty", response.data.length, 0);
}
