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

export async function test_api_department_detail_read_in_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const created = await api.functional.erpHrmTime.member.departments.create(
    memberConnection,
    {
      body: {
        name: `dept-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeDepartment.ICreate,
    },
  );
  typia.assert(created);
  const detail = await api.functional.erpHrmTime.member.departments.at(
    memberConnection,
    {
      departmentId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("department id", detail.id, created.id);
  TestValidator.equals("department name", detail.name, created.name);
  TestValidator.equals(
    "department description",
    detail.description,
    created.description,
  );
  TestValidator.equals("createdAt", detail.createdAt, created.createdAt);
  TestValidator.equals("updatedAt", detail.updatedAt, created.updatedAt);
  TestValidator.equals("deletedAt", detail.deletedAt, created.deletedAt);
  TestValidator.predicate(
    "organization reference exists",
    detail.organization !== null,
  );
  TestValidator.predicate(
    "parent department is absent for top-level department",
    detail.parentDepartment === null,
  );
}
