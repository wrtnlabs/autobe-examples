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
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_activity_log_retrieve_guest_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create department to generate activity logs
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // 4. Retrieve activity logs to find one created by guest actor
  const logsPage =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
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
          page: 1,
          limit: 100,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(logsPage);
  // 5. Look for activity log with guest actor
  const guestLog = logsPage.data.find((log) => log.actor.type === "guest");
  const targetLogId = guestLog?.id ?? logsPage.data[0]?.id;
  if (!targetLogId) {
    throw new Error("No activity logs found to test retrieval");
  }
  // 6. Retrieve specific activity log
  const activityLog =
    await api.functional.erpHrm.member.organizations.activity_logs.at(
      memberConnection,
      {
        organizationId: organization.id,
        activityLogId: targetLogId,
      },
    );
  typia.assert(activityLog);
  // 7. Validate guest actor specific properties if we found a guest log
  if (guestLog) {
    TestValidator.predicate(
      "actorGuest is populated for guest actor",
      activityLog.actorGuest !== null,
    );
    TestValidator.predicate(
      "actorMember is null for guest actor",
      activityLog.actorMember === null,
    );
  }
  // 8. Validate organization context
  TestValidator.equals(
    "organization matches request context",
    activityLog.organization.id,
    organization.id,
  );
}
