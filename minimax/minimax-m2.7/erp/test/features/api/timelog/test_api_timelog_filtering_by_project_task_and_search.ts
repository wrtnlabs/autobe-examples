import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_filtering_by_project_task_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    },
  });
  typia.assert(authorized);
  // 2. Query timelogs with project_id filter
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const projectFilteredResponse =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        project_id: projectId,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(projectFilteredResponse);
  // Validate project filter: all returned timelogs should belong to the specified project
  for (const timelog of projectFilteredResponse.data) {
    TestValidator.equals(
      "timelog belongs to filtered project",
      timelog.project?.id,
      projectId,
    );
  }
  // 3. Query timelogs with task_id filter
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const taskFilteredResponse =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        task_id: taskId,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(taskFilteredResponse);
  // Validate task filter: all returned timelogs should belong to the specified task
  for (const timelog of taskFilteredResponse.data) {
    TestValidator.equals(
      "timelog belongs to filtered task",
      timelog.task?.id,
      taskId,
    );
  }
  // 4. Query timelogs with search parameter
  const searchTerm = "test";
  const searchResponse = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate search response structure
  TestValidator.predicate(
    "search response has data array",
    Array.isArray(searchResponse.data),
  );
  // 5. Query timelogs with combined project_id and task_id filters
  const combinedResponse = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        project_id: projectId,
        task_id: taskId,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(combinedResponse);
  // Validate combined filters: timelogs must match both project and task filters
  for (const timelog of combinedResponse.data) {
    TestValidator.equals(
      "timelog belongs to filtered project",
      timelog.project?.id,
      projectId,
    );
    TestValidator.equals(
      "timelog belongs to filtered task",
      timelog.task?.id,
      taskId,
    );
  }
  // 6. Verify pagination structure is properly returned
  TestValidator.predicate(
    "pagination info is present",
    combinedResponse.pagination !== null &&
      combinedResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has required fields",
    combinedResponse.pagination?.records !== undefined,
    true,
  );
}
