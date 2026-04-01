import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_department_list_filter_by_name_parent_and_deleted_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
      name: RandomGenerator.name(),
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const rootDepartmentName = `root-${RandomGenerator.alphabets(8)}`;
  const childDepartmentName = `child-${RandomGenerator.alphabets(8)}`;
  const siblingDepartmentName = `sibling-${RandomGenerator.alphabets(8)}`;
  const unmatchedDepartmentName = `unmatched-${RandomGenerator.alphabets(8)}`;
  const rootDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: rootDepartmentName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment);
  const childDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: childDepartmentName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: rootDepartment.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  const siblingDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: siblingDepartmentName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(siblingDepartment);
  const unmatchedSearch =
    await api.functional.erpHrmTime.member.departments.index(memberConnection, {
      body: {
        search: unmatchedDepartmentName,
        limit: 100,
        page: 1,
      } satisfies IErpHrmTimeDepartment.IRequest,
    });
  typia.assert(unmatchedSearch);
  TestValidator.equals(
    "unmatched search returns no departments",
    unmatchedSearch.data.length,
    0,
  );
  const rootSearch = await api.functional.erpHrmTime.member.departments.index(
    memberConnection,
    {
      body: {
        search: rootDepartmentName,
        limit: 100,
        page: 1,
      } satisfies IErpHrmTimeDepartment.IRequest,
    },
  );
  typia.assert(rootSearch);
  TestValidator.predicate(
    "search by root department name includes created root department",
    () => rootSearch.data.some((item) => item.id === rootDepartment.id),
  );
  TestValidator.predicate(
    "search by root department name only returns matching departments",
    () =>
      rootSearch.data.every((item) => item.name.includes(rootDepartmentName)),
  );
  const rootOnly = await api.functional.erpHrmTime.member.departments.index(
    memberConnection,
    {
      body: {
        parentDepartmentId: null,
        limit: 100,
        page: 1,
      } satisfies IErpHrmTimeDepartment.IRequest,
    },
  );
  typia.assert(rootOnly);
  TestValidator.predicate(
    "root department filter returns the created root department",
    () => rootOnly.data.some((item) => item.id === rootDepartment.id),
  );
  TestValidator.predicate(
    "root department filter excludes child departments",
    () => rootOnly.data.every((item) => item.parentDepartment === null),
  );
  const childOnly = await api.functional.erpHrmTime.member.departments.index(
    memberConnection,
    {
      body: {
        parentDepartmentId: rootDepartment.id,
        limit: 100,
        page: 1,
      } satisfies IErpHrmTimeDepartment.IRequest,
    },
  );
  typia.assert(childOnly);
  TestValidator.predicate(
    "child department filter returns the created child department",
    () => childOnly.data.some((item) => item.id === childDepartment.id),
  );
  TestValidator.predicate(
    "child department filter only returns the selected branch",
    () =>
      childOnly.data.every(
        (item) => item.parentDepartment?.id === rootDepartment.id,
      ),
  );
  const siblingSearch =
    await api.functional.erpHrmTime.member.departments.index(memberConnection, {
      body: {
        search: siblingDepartmentName,
        limit: 100,
        page: 1,
      } satisfies IErpHrmTimeDepartment.IRequest,
    });
  typia.assert(siblingSearch);
  TestValidator.predicate("sibling search returns the sibling department", () =>
    siblingSearch.data.some((item) => item.id === siblingDepartment.id),
  );
  TestValidator.predicate(
    "sibling search does not leak child branch data",
    () => siblingSearch.data.every((item) => item.parentDepartment === null),
  );
}
