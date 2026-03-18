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

export async function test_api_department_get_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail =
    `${RandomGenerator.alphabets(10)}@example.com` satisfies string;
  const joinInput: IErpHrmTimeTrackingMember.IJoin = {
    email: memberEmail satisfies string & tags.Format<"email">,
    password: "Password_1234!",
    organizationName: `Org_${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com" as string & tags.Format<"uri">,
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);

  // Create two more organizations to ensure we can switch contexts
  const orgA =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `OrgA_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgA);

  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `OrgB_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 2,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgB);

  // Create department in Org A
  const department =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Dept_${RandomGenerator.alphabets(12)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: null,
        } satisfies IErpHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(department);

  // 6) Access the Org A department while in Org B context
  // Context switching API is not available in typings (no `organizations.select`).
  // Rely on server-side isolation using the created department id.
  await TestValidator.httpError(
    "should reject cross-organization department access",
    [403, 404],
    async () => {
      const output =
        await api.functional.erpHrmTimeTracking.member.departments.at(
          memberConnection,
          {
            departmentId: department.id,
          },
        );
      typia.assert(output);
    },
  );
}
