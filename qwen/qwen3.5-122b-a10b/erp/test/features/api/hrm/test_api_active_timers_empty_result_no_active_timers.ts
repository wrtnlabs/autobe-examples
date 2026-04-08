import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActiveTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";

/**
 * Test retrieving active timer sessions when no timers are currently running.
 *
 * Validates the edge case of empty result set handling for the active timers index endpoint. Ensures that the API correctly returns an empty data array with appropriate pagination metadata when no active timer sessions exist in the organization.
 *
 * This test focuses on verifying proper handling of empty query results, including correct pagination metadata calculation when records count is zero. It also validates that the organization context is properly enforced even when no matching records exist.
 *
 * 1. Authenticate as member via join operation.
 * 2. Create a project in the organization (provides organization context, no timer started).
 * 3. Call the active-timers index endpoint with empty request body.
 * 4. Verify response contains empty data array with length 0.
 * 5. Verify pagination metadata shows current=1, records=0, pages=0.
 */
export async function test_api_active_timers_empty_result_no_active_timers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project for organization context (no timer started)
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Member has no organization after join");
  }
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Call active-timers index with empty request body (no active timers exist)
  const activeTimers = await api.functional.hrm.member.active_timers.index(
    memberConnection,
    {
      body: {} satisfies IHrmActiveTimer.IRequest,
    },
  );
  typia.assert(activeTimers);
  // 4. Verify response contains empty data array
  TestValidator.equals("data array is empty", activeTimers.data.length, 0);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    activeTimers.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    activeTimers.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    activeTimers.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    activeTimers.pagination.limit > 0,
  );
}
