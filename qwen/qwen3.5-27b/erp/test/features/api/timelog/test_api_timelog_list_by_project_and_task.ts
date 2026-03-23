import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timelog list filtering by project and task.
 *
 * This test validates the PATCH /hrmPlatform/member/timelogs endpoint's
 * filtering capabilities for project and task-based queries.
 * 1. Authenticate as member user
 * 2. Test filtering with project_id parameter
 * 3. Test filtering with project_id and task_id parameters
 * 4. Validate response structure and pagination
 */
export async function test_api_timelog_list_by_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Test filtering by project_id only
  // Note: In a real test scenario, this would use an actual project UUID
  // that exists in the system with associated timelogs
  const projectOnlyFilter: IHrmPlatformTimelog.IRequest = {
    project_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformTimelog.IRequest;
  const projectOnlyResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: projectOnlyFilter,
    });
  typia.assert(projectOnlyResult);
  // Validate response structure
  TestValidator.predicate(
    "project filter returns valid pagination",
    projectOnlyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "project filter returns valid limit",
    projectOnlyResult.pagination.limit > 0,
  );
  // 3. Test filtering by project_id and task_id
  const projectAndTaskFilter: IHrmPlatformTimelog.IRequest = {
    project_id: typia.random<string & tags.Format<"uuid">>(),
    task_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformTimelog.IRequest;
  const projectAndTaskResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: projectAndTaskFilter,
    });
  typia.assert(projectAndTaskResult);
  // Validate response structure
  TestValidator.predicate(
    "project and task filter returns valid pagination",
    projectAndTaskResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "project and task filter returns valid limit",
    projectAndTaskResult.pagination.limit > 0,
  );
  // 4. Validate timelog structure when data exists
  if (projectAndTaskResult.data.length > 0) {
    const timelogWithTask = projectAndTaskResult.data[0];
    // Validate timelog has required fields
    TestValidator.predicate(
      "timelog has valid ID",
      typeof timelogWithTask.id === "string",
    );
    TestValidator.predicate(
      "timelog has valid duration",
      timelogWithTask.duration > 0,
    );
    // Validate project relationship
    TestValidator.equals(
      "timelog project matches filter",
      timelogWithTask.project.id,
      projectAndTaskFilter.project_id,
    );
    // Validate task relationship when filtered by task
    if (timelogWithTask.task !== null) {
      TestValidator.equals(
        "timelog task matches filter",
        timelogWithTask.task.id,
        projectAndTaskFilter.task_id,
      );
    }
  }
  // 5. Test with additional filter parameters
  const extendedFilter: IHrmPlatformTimelog.IRequest = {
    project_id: typia.random<string & tags.Format<"uuid">>(),
    billable: true,
    page: 1,
    limit: 10,
    sort: "date",
    order: "desc",
  } satisfies IHrmPlatformTimelog.IRequest;
  const extendedResult = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: extendedFilter,
    },
  );
  typia.assert(extendedResult);
  // Validate extended filter response
  TestValidator.equals(
    "extended filter returns correct limit",
    extendedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "extended filter returns valid pagination",
    extendedResult.pagination.pages >= 0,
  );
  // 6. Test pagination
  const paginationFilter: IHrmPlatformTimelog.IRequest = {
    page: 2,
    limit: 5,
  } satisfies IHrmPlatformTimelog.IRequest;
  const paginationResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: paginationFilter,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct page",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination returns correct limit",
    paginationResult.pagination.limit,
    5,
  );
}
