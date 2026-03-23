import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_search_filtered_by_member_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(member);
  // 2. Search activity logs filtered by this member as actor
  const result =
    await api.functional.hrmTracker.member.analytics.activities.index(
      memberConnection,
      {
        body: {
          actor_member_id: member.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result);
  // 3. Validate results structure
  TestValidator.equals("has data array", Array.isArray(result.data), true);
  TestValidator.equals("has pagination", result.pagination !== null, true);
  TestValidator.predicate(
    "pagination has required fields",
    result.pagination.current >= 0 &&
      result.pagination.limit >= 0 &&
      result.pagination.records >= 0 &&
      result.pagination.pages >= 0,
  );
  // 4. Verify all activities have correct actor
  result.data.forEach((activity) => {
    TestValidator.equals(
      "actorMember matches member ID",
      activity.actorMember?.id,
      member.id,
    );
    TestValidator.equals("actorGuest is null", activity.actorGuest, null);
    TestValidator.predicate(
      "action type is valid",
      [
        "employee_invited",
        "employee_deactivated",
        "employee_reactivated",
        "contract_created",
        "contract_edited",
        "project_created",
        "project_archived",
        "project_completed",
        "project_deleted",
        "task_status_changed",
        "timesheet_submitted",
        "timesheet_approved",
        "timesheet_rejected",
        "role_assigned",
        "role_changed",
      ].includes(activity.action_type),
    );
    TestValidator.predicate(
      "created_at is ISO string",
      typeof activity.created_at === "string" &&
        !isNaN(Date.parse(activity.created_at)),
    );
  });
  // 5. Test with multiple activity types filter
  const typedResult =
    await api.functional.hrmTracker.member.analytics.activities.index(
      memberConnection,
      {
        body: {
          actor_member_id: member.id,
          action_type: "project_created",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(typedResult);
  typedResult.data.forEach((activity) => {
    TestValidator.equals(
      "filtered by action type",
      activity.action_type,
      "project_created",
    );
  });
  // 6. Test date range filter
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateResult =
    await api.functional.hrmTracker.member.analytics.activities.index(
      memberConnection,
      {
        body: {
          actor_member_id: member.id,
          created_at_gte: oneDayAgo,
          created_at_lte: now,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateResult);
  // 7. Test pagination parameters
  const paginatedResult =
    await api.functional.hrmTracker.member.analytics.activities.index(
      memberConnection,
      {
        body: {
          actor_member_id: member.id,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "limit respected",
    paginatedResult.data.length <= 5,
    true,
  );
}
