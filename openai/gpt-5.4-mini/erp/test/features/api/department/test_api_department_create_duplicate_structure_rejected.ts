import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";

export async function test_api_department_create_duplicate_structure_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${ownerAuth.token.access}`,
    },
  };
  const departmentName = RandomGenerator.name();
  const created = await generate_random_erp_hrm_time_member_departments_create(
    ownerAuthedConnection,
    {
      body: {
        name: departmentName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "created department name should match",
    created.name,
    departmentName,
  );
  TestValidator.equals(
    "created department should have no parent",
    created.parentDepartment,
    null,
  );
  await TestValidator.httpError(
    "duplicate department name should be rejected",
    [400, 409],
    async () => {
      await generate_random_erp_hrm_time_member_departments_create(
        ownerAuthedConnection,
        {
          body: {
            name: departmentName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
}
