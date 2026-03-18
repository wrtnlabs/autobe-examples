import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member who has never started any timer
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test timer list with no filters - should return empty results
  const emptyResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(emptyResult);
  // 3. Validate pagination metadata for empty results
  TestValidator.equals("records count", emptyResult.pagination.records, 0);
  TestValidator.equals("pages count", emptyResult.pagination.pages, 0);
  TestValidator.equals("current page", emptyResult.pagination.current, 1);
  TestValidator.equals("data array length", emptyResult.data.length, 0);
  // 4. Test with stopped=true filter
  const stoppedResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        stopped: true,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(stoppedResult);
  TestValidator.equals("stopped records", stoppedResult.pagination.records, 0);
  TestValidator.equals("stopped pages", stoppedResult.pagination.pages, 0);
  TestValidator.equals("stopped data length", stoppedResult.data.length, 0);
  // 5. Test with stopped=false filter (running timers)
  const runningResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        stopped: false,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(runningResult);
  TestValidator.equals("running records", runningResult.pagination.records, 0);
  TestValidator.equals("running pages", runningResult.pagination.pages, 0);
  TestValidator.equals("running data length", runningResult.data.length, 0);
  // 6. Test with custom pagination limit
  const limitedResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.equals("limited records", limitedResult.pagination.records, 0);
  TestValidator.equals("limited pages", limitedResult.pagination.pages, 0);
  TestValidator.equals("limited limit", limitedResult.pagination.limit, 50);
  TestValidator.equals("limited data length", limitedResult.data.length, 0);
  // 7. Test with project_id filter (non-existent project)
  const projectFilterResult =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(projectFilterResult);
  TestValidator.equals(
    "project filter records",
    projectFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "project filter data length",
    projectFilterResult.data.length,
    0,
  );
  // 8. Test with task_id filter
  const taskFilterResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        task_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(taskFilterResult);
  TestValidator.equals(
    "task filter records",
    taskFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "task filter data length",
    taskFilterResult.data.length,
    0,
  );
  // 9. Test with date range filter
  const dateFilterResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        started_at: new Date().toISOString(),
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(dateFilterResult);
  TestValidator.equals(
    "date filter records",
    dateFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "date filter data length",
    dateFilterResult.data.length,
    0,
  );
  // 10. Test with description filter
  const descriptionFilterResult =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(descriptionFilterResult);
  TestValidator.equals(
    "description filter records",
    descriptionFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "description filter data length",
    descriptionFilterResult.data.length,
    0,
  );
  // 11. Test with sort parameters
  const sortedResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        sort: "started_at",
        direction: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(sortedResult);
  TestValidator.equals("sorted records", sortedResult.pagination.records, 0);
  TestValidator.equals("sorted data length", sortedResult.data.length, 0);
  // 12. Test with multiple filters combined
  const combinedFilterResult =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        stopped: true,
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "asc",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter records",
    combinedFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter data length",
    combinedFilterResult.data.length,
    0,
  );
}
