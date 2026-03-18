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

export async function test_api_timer_list_retrieve_paginated_timers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
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
  // 4. Start a timer
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
      } satisfies DeepPartial<IErpHrmTimer.ICreate>,
    },
  );
  typia.assert(timer);
  // 5. Retrieve paginated timer list with default pagination
  const response = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(response);
  // 6. Verify pagination metadata is present and valid
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is at least 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "total records is at least 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    response.pagination.pages >= 1,
  );
  // 7. Verify data array contains the created timer
  const foundTimer = response.data.find((t) => t.id === timer.id);
  TestValidator.predicate(
    "created timer exists in paginated list",
    foundTimer !== undefined,
  );
  if (foundTimer) {
    // 8. Verify nested object relationships
    TestValidator.equals(
      "timer project ID matches created project",
      foundTimer.project.id,
      project.id,
    );
    TestValidator.predicate(
      "timer has organizationMember",
      foundTimer.organizationMember !== undefined,
    );
    TestValidator.equals(
      "timer organizationMember user ID matches authorized member",
      foundTimer.organizationMember.user.id,
      authorizedMember.id,
    );
    TestValidator.equals(
      "timer startedAt matches",
      foundTimer.startedAt,
      timer.startedAt,
    );
  }
}
