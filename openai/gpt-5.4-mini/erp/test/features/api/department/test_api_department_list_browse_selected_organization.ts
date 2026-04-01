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

export async function test_api_department_list_browse_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberAuthorizationConnection: api.IConnection = {
    host: connection.host,
  };
  const member = await authorize_member_join(memberAuthorizationConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const rootDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Root ${RandomGenerator.alphabets(8)}`,
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
          name: `Child ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: rootDepartment.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  const page = await api.functional.erpHrmTime.member.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "+name",
      } satisfies IErpHrmTimeDepartment.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 100);
  TestValidator.equals("pagination total records", page.pagination.records, 2);
  TestValidator.equals("pagination total pages", page.pagination.pages, 1);
  TestValidator.equals("department count", page.data.length, 2);
  TestValidator.predicate(
    "all departments belong to current organization",
    () => page.data.every((item) => item.organization !== null),
  );
  TestValidator.predicate("contains root department", () =>
    page.data.some(
      (item) => item.id === rootDepartment.id && item.parentDepartment === null,
    ),
  );
  TestValidator.predicate("contains child department", () =>
    page.data.some(
      (item) =>
        item.id === childDepartment.id &&
        item.parentDepartment?.id === rootDepartment.id,
    ),
  );
  TestValidator.predicate(
    "browse results are summaries with hierarchy references",
    () =>
      page.data.every(
        (item) =>
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          item.createdAt !== undefined &&
          item.updatedAt !== undefined &&
          item.deletedAt !== undefined &&
          item.organization !== undefined,
      ),
  );
}
