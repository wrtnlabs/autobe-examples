import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing all projects within the member's organization using default pagination.
 *
 * Registers a new member and queries the project listing endpoint with an empty request body (no filters). Validates that the paginated response is structurally correct via typia.assert, then inspects the pagination metadata for well-formedness. Since the member has just joined without any organization or project data, the data array is expected to be empty.
 *
 * 1. Join a new member via authorize_member_join and capture the authorized connection.
 * 2. Call PATCH /member/projects with an empty IRequest body for default behavior.
 * 3. Assert the pagination metadata (current=1, limit>0, records=0, pages=0).
 * 4. Assert the data array is empty.
 */
export async function test_api_project_list_all_in_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. List all projects with default pagination (empty request body)
  const projectPage =
    await api.functional.hrmTimeTracking.member.projects.index(
      memberConnection,
      {
        body: {} satisfies IHrmTimeTrackingProject.IRequest,
      },
    );
  typia.assert(projectPage);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", projectPage.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    projectPage.pagination.limit > 0,
  );
  TestValidator.equals("pagination records", projectPage.pagination.records, 0);
  TestValidator.equals("pagination pages", projectPage.pagination.pages, 0);
  // 4. Validate data array is empty (no projects exist)
  TestValidator.equals("data array length", projectPage.data.length, 0);
}
