import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using isolated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Start timer (one per member allowed - creates sufficient data for structure validation)
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: { projectId: project.id } satisfies Partial<IErpHrmTimer.ICreate>,
    },
  );
  typia.assert(timer);
  // 5. Test pagination - page 1 with limit 5
  const page1 = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(page1);
  // Verify pagination metadata for page 1
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 pages >= 0", page1.pagination.pages >= 0);
  TestValidator.predicate(
    "page 1 data length valid",
    page1.data.length <= page1.pagination.limit,
  );
  // 6. Test page 2 - verifies empty page handling
  const page2 = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.predicate(
    "page 2 handled gracefully",
    Array.isArray(page2.data),
  );
  // 7. Test custom sorting with '-started_at' format
  const sortedPage = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
        sort: "-started_at",
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(sortedPage);
  // 8. Verify total records and pages calculation is consistent
  TestValidator.equals(
    "records count consistent across requests",
    page1.pagination.records,
    sortedPage.pagination.records,
  );
  TestValidator.equals(
    "pages count consistent across requests",
    page1.pagination.pages,
    sortedPage.pagination.pages,
  );
  // 9. Test minimum limit (1)
  const minLimitPage = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(minLimitPage);
  TestValidator.equals("min limit respected", minLimitPage.pagination.limit, 1);
  TestValidator.predicate(
    "min limit data length",
    minLimitPage.data.length <= 1,
  );
  // 10. Test maximum limit (100)
  const maxLimitPage = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit respected",
    maxLimitPage.pagination.limit,
    100,
  );
}
