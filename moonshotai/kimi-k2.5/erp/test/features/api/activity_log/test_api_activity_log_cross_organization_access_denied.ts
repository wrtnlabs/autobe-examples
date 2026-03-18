import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_activity_log_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member A and Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const organizationA =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organizationA);
  // 2. Setup Member B and Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  const organizationB =
    await generate_random_erp_hrm_member_organizations_create(
      memberBConnection,
      {},
    );
  typia.assert(organizationB);
  // 3. Member B creates a project to generate an activity log in Organization B
  const project = await generate_random_erp_hrm_member_projects_create(
    memberBConnection,
    {},
  );
  typia.assert(project);
  // 4. Retrieve activity logs from Organization B to obtain an activity log ID
  const activityLogsResponse =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberBConnection,
      {
        organizationId: organizationB.id,
        body: {
          search: null,
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: null,
          limit: null,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsResponse);
  // Verify that activity logs were generated
  TestValidator.predicate(
    "activity logs should exist in Organization B",
    activityLogsResponse.data.length > 0,
  );
  const activityLogBId = activityLogsResponse.data[0].id;
  // 5. Member A attempts to access Organization B's activity log using Organization A's context
  // This should result in 403 Forbidden due to organization isolation
  await TestValidator.httpError(
    "cross-organization activity log access should be denied with 403 Forbidden",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.activity_logs.at(
        memberAConnection,
        {
          organizationId: organizationA.id, // Member A's organization context
          activityLogId: activityLogBId, // Activity log belonging to Organization B
        },
      );
    },
  );
}
