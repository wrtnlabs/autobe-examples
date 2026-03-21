import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_list_own_records(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate a member using the authorization utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Call the timer list endpoint with pagination parameters
  const request: IErpHrmTimer.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimer.IRequest;
  const timerList = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    { body: request },
  );
  typia.assert(timerList);
  // Step 3: Validate pagination structure and business logic
  TestValidator.equals("current page", timerList.pagination.current, 1);
  TestValidator.predicate("limit is positive", timerList.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    timerList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    timerList.pagination.pages >= 0,
  );
  // Step 4: Validate pagination calculation
  if (timerList.pagination.records > 0 && timerList.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      timerList.pagination.records / timerList.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculated correctly",
      timerList.pagination.pages,
      expectedPages,
    );
  }
  // Step 5: Verify that data items count does not exceed limit
  TestValidator.predicate(
    "data items within limit",
    timerList.data.length <= timerList.pagination.limit,
  );
  // Step 6: Validate each timer record structure
  for (const timer of timerList.data) {
    typia.assert(timer);
    // Validate task is properly null or has required fields
    if (timer.task !== null) {
      typia.assert(timer.task);
    }
    // Validate description is properly null or string
    if (timer.description !== null) {
      TestValidator.predicate(
        "description is string when not null",
        typeof timer.description === "string",
      );
    }
  }
}
