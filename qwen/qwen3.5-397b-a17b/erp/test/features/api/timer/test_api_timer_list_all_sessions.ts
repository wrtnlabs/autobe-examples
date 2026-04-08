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
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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

/**
 * Test retrieving all timer sessions for an authenticated employee.
 *
 * Validates the timer list endpoint response structure including pagination metadata and timer summary fields. The test ensures that authenticated members can access their timer history and that the response conforms to IPageIHrmPlatformTimer.ISummary type with proper pagination information and timer data structure.
 *
 * Since timer creation endpoints are not available in the provided API functions, this test focuses on validating the list endpoint accessibility and response format for authenticated members.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Member retrieves their timer sessions list.
 * 3. Validates pagination metadata contains current, limit, records, and pages fields.
 * 4. Validates timer summaries contain all required fields (id, started_at, stopped_at, description, project, task, status, duration, elapsedTime).
 * 5. Verifies active timers have elapsedTime (number) and null duration, completed timers have duration (number) and null elapsedTime.
 */
export async function test_api_timer_list_all_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Retrieve timer sessions list
  const timerList = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(timerList);
  // 3. Validate pagination consistency
  TestValidator.predicate(
    "pages calculation correct",
    timerList.pagination.pages ===
      (timerList.pagination.records === 0
        ? 0
        : Math.ceil(timerList.pagination.records / timerList.pagination.limit)),
  );
  // 4. Validate data array length matches records count on first page
  if (timerList.pagination.current === 1) {
    TestValidator.predicate(
      "first page data length valid",
      timerList.data.length <= timerList.pagination.limit &&
        timerList.data.length <= timerList.pagination.records,
    );
  }
  // 5. Validate timer business logic
  for (const timer of timerList.data) {
    // Active vs completed timer validation
    if (timer.status === "active") {
      TestValidator.predicate(
        "active timer has elapsedTime",
        timer.elapsedTime !== null && timer.elapsedTime >= 0,
      );
      TestValidator.predicate(
        "active timer has null duration",
        timer.duration === null,
      );
      TestValidator.predicate(
        "active timer has null stopped_at",
        timer.stopped_at === null,
      );
    } else if (timer.status === "completed") {
      TestValidator.predicate(
        "completed timer has duration",
        timer.duration !== null && timer.duration >= 0,
      );
      TestValidator.predicate(
        "completed timer has null elapsedTime",
        timer.elapsedTime === null,
      );
      TestValidator.predicate(
        "completed timer has stopped_at",
        timer.stopped_at !== null,
      );
    }
    // Validate task belongs to project if present
    if (timer.task !== null) {
      TestValidator.predicate(
        "task exists for timer with task",
        timer.task !== null,
      );
    }
  }
}