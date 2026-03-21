import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test timelog list with time:view_all permission.
 *
 * This test validates that members with time:view_all permission can view
 * all organization timelogs, while members without this permission can only
 * view their own timelogs.
 *
 * Test flow:
 * 1. Create two members in the same organization
 * 2. Create a project and add both members as project members
 * 3. First member creates a timelog
 * 4. Second member creates a timelog
 * 5. Query timelogs as first member (with time:view_all permission)
 * 6. Verify response includes timelogs from BOTH members
 * 7. Query timelogs as second member (without time:view_all permission)
 * 8. Verify response only includes second member's own timelog
 */
export async function test_api_timelog_list_all_organization_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (who will have time:view_all permission)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member1);
  // 2. Create second member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member2);
  // 3. Create a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {},
  );
  typia.assert(project);
  // 4. Add both members as project members
  // Note: Members need to be added to the project before they can create timelogs
  // We use the generate_random function for this
  await generate_random_erp_hrm_member_projects_members_create(
    member1Connection,
    {
      params: { projectId: project.id },
      body: {},
    },
  );
  await generate_random_erp_hrm_member_projects_members_create(
    member2Connection,
    {
      params: { projectId: project.id },
      body: {},
    },
  );
  // 5. First member creates a timelog
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    member1Connection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
        description: "First member work session",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  // 6. Second member creates a timelog
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    member2Connection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 45,
        description: "Second member work session",
        billable: false,
      },
    },
  );
  typia.assert(timelog2);
  // 7. Query all timelogs as first member
  // First member has time:view_all permission, so they should see all timelogs
  const allTimelogsResponse = await api.functional.erpHrm.member.timelogs.index(
    member1Connection,
    {
      body: {
        limit: 100,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(allTimelogsResponse);
  // 8. Query timelogs as second member (without time:view_all permission)
  // Second member should only see their own timelog
  const member2TimelogsResponse =
    await api.functional.erpHrm.member.timelogs.index(member2Connection, {
      body: {
        limit: 100,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(member2TimelogsResponse);
  // Validation: Verify authorization behavior
  // Member1 (with permission) should see at least 2 timelogs (their own + member2's)
  TestValidator.predicate(
    "member1 sees multiple timelogs with permission",
    allTimelogsResponse.data.length >= 2,
  );
  // Member2 (without permission) should only see 1 timelog (their own)
  TestValidator.equals(
    "member2 sees only own timelog without permission",
    member2TimelogsResponse.data.length,
    1,
  );
  // Verify that member1's timelog is in the allTimelogsResponse
  const member1TimelogInResponse = allTimelogsResponse.data.find(
    (t) => t.id === timelog1.id,
  );
  TestValidator.predicate(
    "member1's timelog found in all timelogs",
    member1TimelogInResponse !== undefined,
  );
  // Verify that member2's timelog is in the allTimelogsResponse
  const member2TimelogInResponse = allTimelogsResponse.data.find(
    (t) => t.id === timelog2.id,
  );
  TestValidator.predicate(
    "member2's timelog found in all timelogs",
    member2TimelogInResponse !== undefined,
  );
  // Verify member2's response only contains their own timelog
  const member2OwnTimelog = member2TimelogsResponse.data.find(
    (t) => t.id === timelog2.id,
  );
  TestValidator.predicate(
    "member2 sees their own timelog",
    member2OwnTimelog !== undefined,
  );
  // Verify member1's timelog is NOT in member2's response
  const member1TimelogInMember2Response = member2TimelogsResponse.data.find(
    (t) => t.id === timelog1.id,
  );
  TestValidator.equals(
    "member2 cannot see member1's timelog",
    member1TimelogInMember2Response,
    null,
  );
}
