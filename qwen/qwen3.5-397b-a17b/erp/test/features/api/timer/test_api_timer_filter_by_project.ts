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
 * Test filtering timer sessions by project ID.
 *
 * Validates the timer filtering functionality by project ID on the PATCH /hrmPlatform/member/timers endpoint. The member authenticates and queries timers filtered by a specific project ID. This test ensures that the projectId filter parameter is properly accepted and that the response structure correctly includes project references in timer summaries.
 *
 * The test verifies that when a projectId filter is provided, the API returns a properly structured paginated response with timer summaries containing project information. Each timer in the response should reference the filtered project if timers exist for that project.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Member queries timers with a specific projectId filter.
 * 3. Validates response structure and pagination metadata.
 * 4. Validates that all returned timers reference the correct project.
 */
export async function test_api_timer_filter_by_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a project ID for filtering
  const filterProjectId = typia.random<string & tags.Format<"uuid">>();
  // 3. Query timers filtered by project ID
  const timerResponse = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        projectId: filterProjectId,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(timerResponse);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    timerResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", timerResponse.pagination.current, 1);
  TestValidator.equals("limit", timerResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    timerResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    timerResponse.pagination.pages >= 0,
  );
  // 5. Validate timer data structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(timerResponse.data),
  );
  // 6. Validate all returned timers match the filter criteria
  for (const timer of timerResponse.data) {
    typia.assert(timer);
    TestValidator.equals(
      "timer project matches filter",
      timer.project.id,
      filterProjectId,
    );
    TestValidator.predicate(
      "timer has valid started_at",
      timer.started_at !== undefined,
    );
    TestValidator.predicate(
      "status is valid",
      timer.status === "active" || timer.status === "completed",
    );
    // Validate duration/elapsedTime based on status
    if (timer.status === "completed") {
      TestValidator.predicate(
        "completed timer has duration",
        timer.duration !== null,
      );
      TestValidator.equals(
        "completed timer elapsedTime is null",
        timer.elapsedTime,
        null,
      );
    } else {
      TestValidator.equals(
        "active timer duration is null",
        timer.duration,
        null,
      );
      TestValidator.predicate(
        "active timer has elapsedTime",
        timer.elapsedTime !== null,
      );
    }
  }
  // 7. Validate pagination consistency
  TestValidator.predicate(
    "data length matches records count",
    timerResponse.data.length === timerResponse.pagination.records,
  );
}
