import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

/**
 * Test cross-organization data isolation for department retrieval.
 *
 * Verifies that multi-tenancy data isolation is enforced — a member in one
 * organization cannot access departments belonging to a different organization.
 * The test uses two independently registered members, each creating their own
 * organization through the join process, to demonstrate that organization
 * context scoping blocks cross-organization data access.
 *
 * 1. Member A joins, creating Organization A, and creates a department.
 * 2. Member B joins, creating a separate Organization B.
 * 3. Member B attempts to retrieve Organization A's department by its ID.
 * 4. Validates the request returns 404 Not Found because the department does
 *    not exist within Organization B's session-scoped organization context,
 *    confirming cross-organization data isolation is properly enforced.
 */
export async function test_api_department_retrieve_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins (creates Organization A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a department in Organization A
  const departmentA = await generate_random_erp_hrm_member_departments_create(
    memberAConnection,
    {},
  );
  typia.assert(departmentA);
  // 3. Member B joins (creates Organization B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B attempts to access Organization A's department — must return 404
  await TestValidator.httpError(
    "cross-organization department access blocked",
    404,
    async () =>
      await api.functional.erpHrm.member.departments.at(memberBConnection, {
        departmentId: departmentA.id,
      }),
  );
}
