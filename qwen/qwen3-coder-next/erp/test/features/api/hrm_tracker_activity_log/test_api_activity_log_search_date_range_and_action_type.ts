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

export async function test_api_activity_log_search_date_range_and_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection with token from join result
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: member.token.access,
  };
  // 3. Search activity logs with date range and action type filters
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result =
    await api.functional.hrmTracker.member.analytics.activities.index(
      authConnection,
      {
        body: {
          created_at_gte: oneHourAgo,
          created_at_lte: now,
          action_type: "project_created",
          sort: "-created_at",
          page: 1,
          limit: 10,
        } satisfies IHrmTrackerActivityLog.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate response structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate("has records", result.data.length >= 0);
  // 5. Verify each log matches both criteria
  for (const log of result.data) {
    // Check date range
    TestValidator.predicate(
      "date within range",
      new Date(log.created_at) >= new Date(oneHourAgo),
    );
    TestValidator.predicate(
      "date within range",
      new Date(log.created_at) <= new Date(now),
    );
    // Check action type filter
    TestValidator.equals(
      "action type matches filter",
      log.action_type,
      "project_created",
    );
  }
}
