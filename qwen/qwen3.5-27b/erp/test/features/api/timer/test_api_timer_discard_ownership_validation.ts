import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_timers_create } from "../../../generate/generate_random_hrm_time_track_member_timers_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timer } from "../../../prepare/prepare_random_hrm_time_track_timer";

/**
 * Test that an employee cannot discard a timer that belongs to another employee.
 *
 * Validates the ownership protection mechanism for timer discard operations. Ensures that cross-employee timer access is forbidden and that only the timer owner can discard their own timer. The test creates two employees in the same organization, each with their own active timer, then attempts to discard one employee's timer using the other employee's credentials.
 *
 * Special attention is given to verifying that the forbidden access attempt does not affect the original timer's state, and that both employees can still manage their own timers independently after the failed cross-ownership attempt.
 *
 * 1. Register and authenticate as member A (employee A).
 * 2. Create an organization for both employees.
 * 3. Create a project within the organization.
 * 4. Start a timer for employee A (timer_A).
 * 5. Register and authenticate as member B (employee B).
 * 6. Start a timer for employee B (timer_B).
 * 7. As employee B, attempt to discard timer_A (should fail with 403 Forbidden).
 * 8. Verify timer_A remains active by having employee A discard it successfully.
 * 9. Verify employee B can still discard their own timer (timer_B).
 */
export async function test_api_timer_discard_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberA);
  // 2. Create organization (as member A)
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project (as member A)
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 4. Start a timer for employee A
  const timerA = await generate_random_hrm_time_track_member_timers_create(
    memberAConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timerA);
  // 5. Register and authenticate as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberB);
  // 6. Start a timer for employee B
  const timerB = await generate_random_hrm_time_track_member_timers_create(
    memberBConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timerB);
  // 7. As employee B, attempt to discard timer_A (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "employee B cannot discard employee A's timer",
    403,
    async () =>
      await api.functional.hrmTimeTrack.member.timers.erase(memberBConnection, {
        timerId: timerA.id,
      }),
  );
  // 8. Verify timer_A remains active by having employee A discard it successfully
  await api.functional.hrmTimeTrack.member.timers.erase(memberAConnection, {
    timerId: timerA.id,
  });
  // 9. Verify employee B can still discard their own timer (timer_B)
  await api.functional.hrmTimeTrack.member.timers.erase(memberBConnection, {
    timerId: timerB.id,
  });
}
