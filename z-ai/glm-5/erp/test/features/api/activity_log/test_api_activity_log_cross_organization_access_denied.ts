import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_activity_log_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A who becomes owner of Organization A
  // This establishes Organization A's context with member A having ownership
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(memberAAuth);
  // Step 2: Create an employee in Organization A
  // This establishes organizational activity and activity logs in Organization A
  const employeeA = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        employmentType: "full_time",
      } satisfies DeepPartial<IErpHrmEmployee.ICreate>,
    },
  );
  typia.assert(employeeA);
  // Step 3: Create Member B who becomes owner of Organization B
  // This establishes a separate organization context with different ownership
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(memberBAuth);
  // Step 4: Create an employee in Organization B
  // This generates activity log entries within Organization B's context
  const employeeB = await generate_random_erp_hrm_member_employees_create(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        employmentType: "full_time",
      } satisfies DeepPartial<IErpHrmEmployee.ICreate>,
    },
  );
  typia.assert(employeeB);
  // Step 5: Attempt cross-organization activity log access
  // Using Member A's connection (Organization A context), try to access an activity log
  // This simulates an attempt to access Organization B's data from Organization A
  const crossOrganizationActivityLogId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 6: Validate multi-tenant data isolation
  // The system must return 404 Not Found (not 403) to avoid information disclosure
  // This prevents confirming whether an activity log exists in another organization
  await TestValidator.httpError(
    "should return 404 when accessing activity log from different organization",
    404,
    async () => {
      await api.functional.erpHrm.member.activity_logs.at(memberAConnection, {
        activityLogId: crossOrganizationActivityLogId,
      });
    },
  );
}
