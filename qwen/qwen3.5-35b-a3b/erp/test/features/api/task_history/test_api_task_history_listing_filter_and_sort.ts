import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_history_listing_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/signup",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test basic listing without filters
  const allHistory =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  typia.assert<IPageIHrmPlatformTaskHistory.ISummary>(allHistory);
  TestValidator.predicate(
    "basic listing returns pagination structure",
    allHistory.pagination !== undefined,
  );
  // 3. Test filter by action_type
  const actionTypeFilters = [
    "status_change",
    "assignment_change",
    "title_change",
    "description_change",
  ];
  for (const actionType of actionTypeFilters) {
    const filteredByAction =
      await api.functional.hrmPlatform.member.task_histories.index(
        memberConnection,
        {
          body: {
            action_type: actionType,
          } satisfies IHrmPlatformTaskHistory.IRequest,
        },
      );
    typia.assert(filteredByAction);
    typia.assert<IPageIHrmPlatformTaskHistory.ISummary>(filteredByAction);
    TestValidator.predicate(
      `action_type=${actionType} filter returns pagination`,
      filteredByAction.pagination !== undefined,
    );
  }
  // 4. Test filter by task_id (non-existent task should return empty)
  const fakeTaskId = typia.random<string & tags.Format<"uuid">>();
  const filteredByTask =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          task_id: fakeTaskId,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByTask);
  TestValidator.equals(
    "non-existent task_id filter returns empty results",
    filteredByTask.data.length,
    0,
  );
  // 5. Test filter by actor_id (non-existent actor should return empty)
  const fakeActorId = typia.random<string & tags.Format<"uuid">>();
  const filteredByActor =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          actor_id: fakeActorId,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByActor);
  TestValidator.equals(
    "non-existent actor_id filter returns empty results",
    filteredByActor.data.length,
    0,
  );
  // 6. Test date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filteredByDateRange =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          changed_at_gte: oneWeekAgo.toISOString(),
          changed_at_lte: now.toISOString(),
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  TestValidator.predicate(
    "date range filter returns pagination",
    filteredByDateRange.pagination !== undefined,
  );
  // 7. Test status_before and status_after filters with action_type=status_change
  const filteredByStatusChange =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          action_type: "status_change",
          status_before: "TODO",
          status_after: "IN_PROGRESS",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByStatusChange);
  TestValidator.predicate(
    "status_before/after with action_type returns pagination",
    filteredByStatusChange.pagination !== undefined,
  );
  // 8. Test status_before without action_type
  const filteredByStatusWithoutType =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          status_before: "TODO",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByStatusWithoutType);
  // 9. Test sorting by changed_at DESC
  const sortedByChangedAt =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          sort_by: "changed_at",
          sort_order: "desc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(sortedByChangedAt);
  TestValidator.predicate(
    "sort by changed_at DESC returns pagination",
    sortedByChangedAt.pagination !== undefined,
  );
  // 10. Test sorting by created_at ASC
  const sortedByCreatedAt =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  // 11. Test sorting by action_type
  const sortedByActionType =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          sort_by: "action_type",
          sort_order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(sortedByActionType);
  // 12. Test sorting by task_id
  const sortedByTaskId =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          sort_by: "task_id",
          sort_order: "desc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(sortedByTaskId);
  // 13. Test pagination with custom limit
  const paginatedResults =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          limit: 5,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "custom limit parameter applied",
    paginatedResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "custom limit does not exceed max",
    paginatedResults.pagination.limit <= 100,
  );
  // 14. Test pagination with page number
  const paginatedPage2 =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(paginatedPage2);
  TestValidator.equals(
    "page=2 parameter applied",
    paginatedPage2.pagination.current,
    2,
  );
  // 15. Test combined filters
  const combinedFilters =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          action_type: "status_change",
          changed_at_gte: oneWeekAgo.toISOString(),
          sort_by: "changed_at",
          sort_order: "desc",
          limit: 10,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // 16. Test empty results with multiple filters
  const emptyResult =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          task_id: typia.random<string & tags.Format<"uuid">>(),
          actor_id: typia.random<string & tags.Format<"uuid">>(),
          action_type: "non_existent_type",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "multiple non-matching filters return records=0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "multiple non-matching filters return pages=0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "multiple non-matching filters return empty array",
    emptyResult.data.length,
    0,
  );
}
