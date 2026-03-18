import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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

export async function test_api_activity_log_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create project to generate activity log entry
  await generate_random_erp_hrm_member_projects_create(memberConnection, {});
  // 4. Retrieve activity logs to get valid activityLogId
  const activityLogs =
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
          limit: 20,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(activityLogs);
  // Validate we got at least one activity log
  TestValidator.predicate(
    "activity logs should exist",
    activityLogs.data.length > 0,
  );
  const activityLogId = activityLogs.data[0].id;
  const randomDetailId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve non-existent detail - should return 404
  await TestValidator.httpError(
    "should return 404 for non-existent activity log detail",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.activity_logs.details.at(
        memberConnection,
        {
          organizationId: organization.id,
          activityLogId: activityLogId,
          detailId: randomDetailId,
        },
      );
    },
  );
}
