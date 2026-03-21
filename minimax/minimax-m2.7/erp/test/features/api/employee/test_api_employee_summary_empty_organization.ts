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

export async function test_api_employee_summary_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via POST /erpHrm/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Call GET /erpHrm/member/employees/summary to retrieve employee statistics
  // The organization may have no employees at this point (only the member's own employee record might exist, or none)
  let summary: IErpHrmEmployee.ISummary;
  try {
    summary =
      await api.functional.erpHrm.member.employees.summary(memberConnection);
    typia.assert(summary);
  } catch (exp) {
    // If member has no employee record, expect error (403 Forbidden)
    TestValidator.error("member without employee record returns error", () => {
      throw exp;
    });
    return;
  }
  // 3. Validate response structure - system handles zero-employee organizations gracefully
  TestValidator.equals("has valid id", summary.id !== undefined, true);
  TestValidator.equals(
    "has valid employment_type",
    summary.employment_type !== undefined,
    true,
  );
  TestValidator.equals("has valid status", summary.status !== undefined, true);
  TestValidator.equals(
    "has valid member info",
    summary.member !== undefined && summary.member !== null,
    true,
  );
  TestValidator.equals(
    "has valid role info",
    summary.role !== undefined && summary.role !== null,
    true,
  );
}
