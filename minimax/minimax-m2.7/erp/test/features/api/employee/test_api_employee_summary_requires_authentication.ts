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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify that unauthenticated requests to the employee summary endpoint are rejected.
 *
 * This test validates that the GET /erpHrm/member/employees/summary endpoint
 * properly enforces authentication requirements. Without an Authorization header,
 * the endpoint must return 401 Unauthorized to prevent unauthorized access to
 * organizational employee statistics.
 *
 * Steps:
 * 1. Create a connection WITHOUT any authentication headers
 * 2. Call GET /erpHrm/member/employees/summary directly
 * 3. Validate response returns 401 Unauthorized
 */
export async function test_api_employee_summary_requires_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Use the base connection without authentication headers
  // The connection object should NOT have Authorization header set
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  // Attempt to access employee summary without authentication
  // Expected: 401 Unauthorized error
  await TestValidator.httpError(
    "employee summary requires authentication - returns 401 for unauthenticated request",
    401,
    async () =>
      await api.functional.erpHrm.member.employees.summary(
        unauthenticatedConnection,
      ),
  );
}
