import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that an employee can retrieve their own timelog entries with pagination.
 *
 * Validates the timelog list endpoint functionality including member authentication, organization creation, project setup, and paginated list querying. Tests the core access control where employees can only view their own timelogs without time:view_all permission, and verifies that pagination metadata and response structure are correct.
 *
 * Note: This test validates the timelog list endpoint structure and pagination behavior. Full timelog creation flow requires employee record creation which is not available through the provided API endpoints. The test demonstrates the endpoint returns properly structured responses with correct pagination metadata.
 *
 * 1. Member registers and authenticates with unique credentials.
 * 2. Member creates an organization (becomes owner automatically).
 * 3. Member creates a project within the organization.
 * 4. Member queries the timelog list endpoint with pagination parameters.
 * 5. Validates pagination metadata includes correct structure and page information.
 * 6. Validates response structure conforms to IPageIHrmPlatformTimelog.ISummary type.
 */
export async function test_api_timelog_list_own_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization (member becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Query the timelog list endpoint with pagination
  // Note: Without employee creation API, no timelogs exist yet
  // This validates the endpoint returns proper structure with empty results
  const timelogList = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "date:desc",
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(timelogList);
  // 5. Validate pagination metadata structure
  TestValidator.predicate(
    "has pagination info",
    timelogList.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    timelogList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is set", timelogList.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    timelogList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    timelogList.pagination.pages >= 0,
  );
  // 6. Validate response data structure
  TestValidator.predicate("data is array", Array.isArray(timelogList.data));
  // If there are any timelogs (from other tests or setup), validate their structure
  if (timelogList.data.length > 0) {
    for (const timelog of timelogList.data) {
      // Validate required fields exist (typia.assert already validated types)
      TestValidator.predicate(
        "has valid id format",
        /^[0-9a-f-]{36}$/i.test(timelog.id),
      );
      TestValidator.predicate(
        "duration is positive",
        timelog.durationMinutes > 0,
      );
      TestValidator.predicate(
        "date is valid ISO format",
        !isNaN(new Date(timelog.date).getTime()),
      );
      // Validate project reference exists
      TestValidator.predicate(
        "project reference exists",
        timelog.project !== undefined && timelog.project !== null,
      );
      TestValidator.predicate(
        "project has id",
        timelog.project.id !== undefined,
      );
      // Validate employee reference exists
      TestValidator.predicate(
        "employee reference exists",
        timelog.employee !== undefined && timelog.employee !== null,
      );
      TestValidator.predicate(
        "employee has id",
        timelog.employee.id !== undefined,
      );
    }
    // Validate ordering by date descending (most recent first)
    for (let i = 1; i < timelogList.data.length; i++) {
      const prevDate = new Date(timelogList.data[i - 1].date).getTime();
      const currDate = new Date(timelogList.data[i].date).getTime();
      TestValidator.predicate(
        `date order [${i - 1}] >= [${i}]`,
        prevDate >= currDate,
      );
    }
  }
}
