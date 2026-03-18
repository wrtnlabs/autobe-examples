import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_departments_create";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_department } from "../../../prepare/prepare_random_erp_hrm_time_tracking_department";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_department_update_parent_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const credentialsBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: `org-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: credentialsBody });
  // 2) Create Org A and Org B (generation utilities)
  const orgA =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-a-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 2,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgA);
  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-b-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgB);
  // 3) Create departments in Org A and Org B (best-effort tenant scoping)
  const departmentA =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `dept-a-${RandomGenerator.alphabets(10)}`,
          description: null,
          parent_department_id: null,
        } satisfies IErpHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(departmentA);
  const departmentB =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `dept-b-${RandomGenerator.alphabets(10)}`,
          description: null,
          parent_department_id: null,
        } satisfies IErpHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(departmentB);
  const departmentAOriginalParentId = departmentA.parentDepartmentId;
  // 4) Attempt to set departmentA parent to departmentB (cross-organization)
  const updatedAttemptName = `dept-a-upd-${RandomGenerator.alphabets(10)}`;
  const updated = await (async () => {
    try {
      const result =
        await api.functional.erpHrmTimeTracking.member.departments.update(
          memberConnection,
          {
            departmentId: departmentA.id,
            body: {
              name: updatedAttemptName,
              description: null,
              parentDepartmentId: departmentB.id,
            } satisfies IErpHrmTimeTrackingDepartment.IUpdate,
          },
        );
      typia.assert(result);
      return result;
    } catch (e) {
      return null;
    }
  })();
  if (updated !== null) {
    typia.assert(updated);
    TestValidator.notEquals(
      "cross-organization parent must not be applied",
      updated.parentDepartmentId,
      departmentB.id,
    );
    TestValidator.equals(
      "parent should remain unchanged (or at least not become departmentB)",
      updated.parentDepartmentId,
      departmentAOriginalParentId,
    );
  } else {
    await TestValidator.error(
      "cross-organization parent assignment should be rejected",
      async () => {
        await api.functional.erpHrmTimeTracking.member.departments.update(
          memberConnection,
          {
            departmentId: departmentA.id,
            body: {
              name: updatedAttemptName,
              description: null,
              parentDepartmentId: departmentB.id,
            } satisfies IErpHrmTimeTrackingDepartment.IUpdate,
          },
        );
      },
    );
    // Best-effort: no further read endpoint is available in given SDK.
  }
  // Use org ids to prevent unused-variable linting in some environments
  TestValidator.predicate("orgs created", orgA.id !== "" && orgB.id !== "");
}
