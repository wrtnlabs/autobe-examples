import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_filtering_by_action_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Fetch all activity logs without filters (baseline)
  const allLogs = await api.functional.hrmPlatform.member.activity_logs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformActivityLog.IRequest,
    },
  );
  typia.assert(allLogs);
  TestValidator.predicate("has pagination", allLogs.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(allLogs.data));
  // 3. Test filtering by action_type
  if (allLogs.data.length > 0) {
    const sampleActionType = allLogs.data[0].action_type;
    const filteredByActionType =
      await api.functional.hrmPlatform.member.activity_logs.index(
        memberConnection,
        {
          body: {
            action_type: sampleActionType,
            page: 1,
            limit: 100,
          } satisfies IHrmPlatformActivityLog.IRequest,
        },
      );
    typia.assert(filteredByActionType);
    TestValidator.predicate(
      "all logs match action_type",
      filteredByActionType.data.every(
        (log) => log.action_type === sampleActionType,
      ),
    );
  }
  // 4. Test filtering by date range
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayInFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const filteredByDate =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          created_at_from: sevenDaysAgo.toISOString(),
          created_at_to: oneDayInFuture.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "all logs within date range",
    filteredByDate.data.every((log) => {
      const logDate = new Date(log.created_at);
      return logDate >= sevenDaysAgo && logDate <= oneDayInFuture;
    }),
  );
  // 5. Test filtering by member_id
  const filteredByMember =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          member_id: authResult.member.id,
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(filteredByMember);
  TestValidator.predicate(
    "all logs match member_id",
    filteredByMember.data.every(
      (log) => log.member.id === authResult.member.id,
    ),
  );
  // 6. Test filtering by target_entity_type
  if (allLogs.data.length > 0) {
    const sampleEntityType = allLogs.data[0].target_entity_type;
    const filteredByEntityType =
      await api.functional.hrmPlatform.member.activity_logs.index(
        memberConnection,
        {
          body: {
            target_entity_type: sampleEntityType,
            page: 1,
            limit: 100,
          } satisfies IHrmPlatformActivityLog.IRequest,
        },
      );
    typia.assert(filteredByEntityType);
    TestValidator.predicate(
      "all logs match target_entity_type",
      filteredByEntityType.data.every(
        (log) => log.target_entity_type === sampleEntityType,
      ),
    );
  }
  // 7. Test filtering by target_entity_id
  if (allLogs.data.length > 0 && allLogs.data[0].target_entity_id) {
    const sampleEntityId = allLogs.data[0].target_entity_id;
    const filteredByEntityId =
      await api.functional.hrmPlatform.member.activity_logs.index(
        memberConnection,
        {
          body: {
            target_entity_id: sampleEntityId,
            page: 1,
            limit: 100,
          } satisfies IHrmPlatformActivityLog.IRequest,
        },
      );
    typia.assert(filteredByEntityId);
    TestValidator.predicate(
      "all logs match target_entity_id",
      filteredByEntityId.data.every(
        (log) => log.target_entity_id === sampleEntityId,
      ),
    );
  }
  // 8. Test combined filters (action_type + date range)
  if (allLogs.data.length > 0) {
    const sampleActionType = allLogs.data[0].action_type;
    const combinedFilters =
      await api.functional.hrmPlatform.member.activity_logs.index(
        memberConnection,
        {
          body: {
            action_type: sampleActionType,
            created_at_from: sevenDaysAgo.toISOString(),
            created_at_to: oneDayInFuture.toISOString(),
            page: 1,
            limit: 100,
          } satisfies IHrmPlatformActivityLog.IRequest,
        },
      );
    typia.assert(combinedFilters);
    TestValidator.predicate(
      "combined filters work correctly",
      combinedFilters.data.every(
        (log) =>
          log.action_type === sampleActionType &&
          new Date(log.created_at) >= sevenDaysAgo &&
          new Date(log.created_at) <= oneDayInFuture,
      ),
    );
  }
  // 9. Test empty result set with impossible filter
  const emptyResult =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          action_type: "nonexistent_action_type_xyz_123",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for nonexistent action",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyResult.pagination.records,
    0,
  );
  // 10. Test pagination with filtered results
  const paginatedResult =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResult.pagination.limit,
    10,
  );
  // 11. Test pagination page 2 if enough records exist
  if (paginatedResult.pagination.records > 10) {
    const page2Result =
      await api.functional.hrmPlatform.member.activity_logs.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IHrmPlatformActivityLog.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "pagination page 2",
      page2Result.pagination.current,
      2,
    );
    if (page2Result.data.length > 0 && paginatedResult.data.length > 0) {
      TestValidator.notEquals(
        "page 2 has different data",
        page2Result.data[0].id,
        paginatedResult.data[0].id,
      );
    }
  }
}
