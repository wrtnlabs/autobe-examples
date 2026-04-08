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

export async function test_api_department_detail_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const sourceConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sourceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding/source",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const sourceDepartment =
    await api.functional.erpHrmTime.member.departments.create(
      sourceConnection,
      {
        body: {
          name: `${RandomGenerator.name(2)} ${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(sourceDepartment);
  const targetConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding/target",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.httpError(
    "cross-organization department detail should be rejected",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.departments.at(targetConnection, {
        departmentId: sourceDepartment.id,
      });
    },
  );
}
