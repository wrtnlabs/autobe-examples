import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_activity_log_detail_pagination_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization as prerequisite
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Use random activity log ID (activity log creation not available in dependencies)
  const activityLogId = typia.random<string & tags.Format<"uuid">>();
  // 4. Fetch activity log details with default pagination settings
  const response =
    await api.functional.erpHrm.member.organizations.activity_logs.details.index(
      memberConnection,
      {
        organizationId: organization.id,
        activityLogId: activityLogId,
        body: {} satisfies IErpHrmActivityLogDetail.IRequest,
      },
    );
  // 5. Validate response structure and pagination metadata
  typia.assert(response);
  // Validate pagination metadata exists and has correct structure
  TestValidator.predicate(
    "pagination metadata exists",
    response.pagination !== null && response.pagination !== undefined,
  );
  // Validate default pagination values (page defaults to 1, limit defaults to 20)
  TestValidator.equals(
    "default current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // Validate records and pages are non-negative
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
}
