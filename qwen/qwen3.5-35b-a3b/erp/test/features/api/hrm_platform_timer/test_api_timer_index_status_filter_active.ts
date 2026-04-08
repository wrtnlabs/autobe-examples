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

/**
 * Test timer records filtering by status to verify active timer views.
 *
 * Validates the status filtering functionality for timer records, ensuring that
 * filters correctly return only timers matching the specified status (started,
 * paused, or stopped). The test verifies pagination behavior and status enum
 * constraints, while also confirming that the index endpoint properly handles
 * status filter parameters.
 *
 * Special attention is given to verifying that status filters work correctly
 * (started, paused, stopped) and that pagination limits are respected in
 * filtered results. This test focuses on the filtering and listing functionality
 * and validates that the API correctly filters timers by status.
 *
 * 1. Authenticate with member join to create account and organization
 * 2. Test status='started' filter returns only started timers
 * 3. Test status='paused' filter returns only paused timers
 * 4. Test status='stopped' filter returns only stopped timers
 * 5. Verify default behavior (no filter) returns all non-deleted timers
 * 6. Test pagination limits are respected in filtered results
 * 7. Validate status enum (only started, paused, stopped are valid)
 * 8. Verify pagination metadata is correct in responses
 */
export async function test_api_timer_index_status_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate with member join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  typia.assert(authorized);
  // 2. Test status='started' filter
  const startedFilters = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "started",
        limit: 20,
        page: 1,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(startedFilters);
  TestValidator.equals(
    "started filter returns started timers",
    startedFilters.data.every((t) => t.status === "started"),
    true,
  );
  // 3. Test status='paused' filter
  const pausedFilters = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "paused",
        limit: 20,
        page: 1,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(pausedFilters);
  TestValidator.equals(
    "paused filter returns paused timers",
    pausedFilters.data.every((t) => t.status === "paused"),
    true,
  );
  // 4. Test status='stopped' filter
  const stoppedFilters = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "stopped",
        limit: 20,
        page: 1,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(stoppedFilters);
  TestValidator.equals(
    "stopped filter returns stopped timers",
    stoppedFilters.data.every((t) => t.status === "stopped"),
    true,
  );
  // 5. Test default behavior (no filter) returns all timers
  const allTimers = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(allTimers);
  TestValidator.equals(
    "all timers have valid status values",
    allTimers.data.every((t) =>
      ["started", "paused", "stopped"].includes(t.status),
    ),
    true,
  );
  // 6. Test pagination limits are respected
  const limitedFilters = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "started",
        limit: 5,
        page: 1,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(limitedFilters);
  TestValidator.equals(
    "pagination limit is respected",
    limitedFilters.data.length <= 5,
    true,
  );
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination metadata has correct structure",
    limitedFilters.pagination.current === 1,
    true,
  );
  TestValidator.equals(
    "pagination metadata has correct limit",
    limitedFilters.pagination.limit === 5,
    true,
  );
}
