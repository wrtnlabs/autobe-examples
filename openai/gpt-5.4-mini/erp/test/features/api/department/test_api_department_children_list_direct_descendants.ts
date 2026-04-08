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

export async function test_api_department_children_list_direct_descendants(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `member_${RandomGenerator.alphabets(8)}@test.com`;
  const memberPassword = `Passw0rd!${RandomGenerator.alphabets(6)}`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: "http://localhost/onboarding",
      referrer: "http://localhost/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const parentDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  const directChildren = await ArrayUtil.asyncRepeat(3, async (index) => {
    const child = await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `child-${index}-${RandomGenerator.alphabets(6)}`,
          description:
            index === 1
              ? "search-target direct child"
              : `direct-child-${index}`,
          parentDepartmentId: parentDepartment.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
    typia.assert(child);
    return child;
  });
  const grandchild =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `grandchild-${RandomGenerator.alphabets(8)}`,
          description: "search-target grandchild",
          parentDepartmentId: directChildren[0].id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(grandchild);
  const defaultPage =
    await api.functional.erpHrmTime.member.departments.children.index(
      memberConnection,
      {
        departmentId: parentDepartment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "direct children count",
    defaultPage.data.length,
    directChildren.length,
  );
  TestValidator.equals("pagination current", defaultPage.pagination.current, 1);
  TestValidator.equals("pagination limit", defaultPage.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    defaultPage.pagination.records,
    directChildren.length,
  );
  TestValidator.equals("pagination pages", defaultPage.pagination.pages, 1);
  TestValidator.predicate(
    "grandchild excluded from direct children",
    !defaultPage.data.some((child) => child.id === grandchild.id),
  );
  const expectedIds = directChildren.map((child) => child.id).sort();
  const actualIds = defaultPage.data.map((child) => child.id).sort();
  TestValidator.equals("direct child ids", actualIds, expectedIds);
  for (const child of defaultPage.data) {
    TestValidator.equals(
      "child organization id matches",
      child.organization.id,
      parentDepartment.organization.id,
    );
    TestValidator.equals(
      "child parent department id",
      child.parentDepartment?.id,
      parentDepartment.id,
    );
    TestValidator.predicate("child has name", child.name.length > 0);
    TestValidator.equals(
      "child description preserved",
      typeof child.description,
      "string",
    );
  }
  const searchPage =
    await api.functional.erpHrmTime.member.departments.children.index(
      memberConnection,
      {
        departmentId: parentDepartment.id,
        body: {
          search: "search-target",
          page: 1,
          limit: 10,
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(searchPage);
  TestValidator.predicate(
    "search narrows to matching direct children only",
    searchPage.data.every(
      (child) => child.description?.includes("search-target") ?? false,
    ),
  );
  TestValidator.predicate(
    "search still excludes grandchild",
    !searchPage.data.some((child) => child.id === grandchild.id),
  );
  const smallPage =
    await api.functional.erpHrmTime.member.departments.children.index(
      memberConnection,
      {
        departmentId: parentDepartment.id,
        body: {
          page: 1,
          limit: 1,
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals("small page limit", smallPage.pagination.limit, 1);
  TestValidator.predicate(
    "small page has one or zero record",
    smallPage.data.length <= 1,
  );
  TestValidator.equals(
    "small page records",
    smallPage.pagination.records,
    directChildren.length,
  );
  TestValidator.predicate(
    "small page pages computed",
    smallPage.pagination.pages >= 3,
  );
}
