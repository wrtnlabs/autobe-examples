import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeDepartment";
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

export async function test_api_department_children_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/a",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/b",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberB);
  const organizationAParent =
    await generate_random_erp_hrm_time_member_departments_create(
      memberAConnection,
      {
        body: {
          name: `org-a-parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(organizationAParent);
  const organizationAChildOne =
    await generate_random_erp_hrm_time_member_departments_create(
      memberAConnection,
      {
        body: {
          name: `org-a-child-1-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: organizationAParent.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(organizationAChildOne);
  const organizationAChildTwo =
    await generate_random_erp_hrm_time_member_departments_create(
      memberAConnection,
      {
        body: {
          name: `org-a-child-2-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: organizationAParent.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(organizationAChildTwo);
  const organizationBParent =
    await generate_random_erp_hrm_time_member_departments_create(
      memberBConnection,
      {
        body: {
          name: `org-b-parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(organizationBParent);
  const organizationBChild =
    await generate_random_erp_hrm_time_member_departments_create(
      memberBConnection,
      {
        body: {
          name: organizationAChildOne.name,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: organizationBParent.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(organizationBChild);
  const result =
    await api.functional.erpHrmTime.member.departments.children.index(
      memberAConnection,
      {
        departmentId: organizationAParent.id,
        body: {
          page: 1,
          limit: 100,
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals("organization A children count", result.data.length, 2);
  TestValidator.predicate(
    "organization A child one is present",
    ArrayUtil.has(result.data, (item) => item.id === organizationAChildOne.id),
  );
  TestValidator.predicate(
    "organization A child two is present",
    ArrayUtil.has(result.data, (item) => item.id === organizationAChildTwo.id),
  );
  TestValidator.predicate(
    "organization B child is not leaked",
    !ArrayUtil.has(result.data, (item) => item.id === organizationBChild.id),
  );
  TestValidator.predicate(
    "all returned departments belong to organization A",
    result.data.every(
      (item) => item.organization.id === organizationAParent.organization.id,
    ),
  );
  TestValidator.predicate(
    "all returned departments have the requested parent",
    result.data.every(
      (item) => item.parentDepartment?.id === organizationAParent.id,
    ),
  );
}
