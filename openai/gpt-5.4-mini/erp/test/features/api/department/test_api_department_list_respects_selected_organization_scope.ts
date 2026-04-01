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

export async function test_api_department_list_respects_selected_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerOneConnection: api.IConnection = { host: connection.host };
  const ownerTwoConnection: api.IConnection = { host: connection.host };
  const ownerOne = await authorize_member_join(ownerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/join",
      referrer: "https://example.com/erp/invite",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerOne);
  const ownerTwo = await authorize_member_join(ownerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/join",
      referrer: "https://example.com/erp/invite",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerTwo);
  const orgOneSeed = `org-one-${RandomGenerator.alphabets(8)}`;
  const orgTwoSeed = `org-two-${RandomGenerator.alphabets(8)}`;
  const organizationOneDepartments = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const created = await api.functional.erpHrmTime.member.departments.create(
        ownerOneConnection,
        {
          body: {
            name: `${orgOneSeed}-${index}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimeDepartment.ICreate,
        },
      );
      typia.assert(created);
      return created;
    },
  );
  const organizationTwoDepartments = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const created = await api.functional.erpHrmTime.member.departments.create(
        ownerTwoConnection,
        {
          body: {
            name: `${orgTwoSeed}-${index}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimeDepartment.ICreate,
        },
      );
      typia.assert(created);
      return created;
    },
  );
  const organizationOneList =
    await api.functional.erpHrmTime.member.departments.index(
      ownerOneConnection,
      {
        body: {
          page: 1,
          limit: 2,
          search: orgOneSeed,
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(organizationOneList);
  const organizationOneSecondPage =
    await api.functional.erpHrmTime.member.departments.index(
      ownerOneConnection,
      {
        body: {
          page: 2,
          limit: 2,
          search: orgOneSeed,
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(organizationOneSecondPage);
  const organizationTwoList =
    await api.functional.erpHrmTime.member.departments.index(
      ownerTwoConnection,
      {
        body: {
          page: 1,
          limit: 2,
          search: orgTwoSeed,
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(organizationTwoList);
  const organizationTwoSecondPage =
    await api.functional.erpHrmTime.member.departments.index(
      ownerTwoConnection,
      {
        body: {
          page: 2,
          limit: 2,
          search: orgTwoSeed,
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
  typia.assert(organizationTwoSecondPage);
  TestValidator.equals(
    "organization one total records",
    organizationOneList.pagination.records,
    organizationOneDepartments.length,
  );
  TestValidator.equals(
    "organization two total records",
    organizationTwoList.pagination.records,
    organizationTwoDepartments.length,
  );
  TestValidator.equals(
    "organization one page size",
    organizationOneList.pagination.limit,
    2,
  );
  TestValidator.equals(
    "organization two page size",
    organizationTwoList.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "organization one page 1 only contains org one departments",
    () =>
      organizationOneList.data.every(
        (department) =>
          department.name.startsWith(orgOneSeed) &&
          !organizationTwoDepartments.some(
            (other) => other.id === department.id,
          ),
      ),
  );
  TestValidator.predicate(
    "organization one page 2 only contains org one departments",
    () =>
      organizationOneSecondPage.data.every(
        (department) =>
          department.name.startsWith(orgOneSeed) &&
          !organizationTwoDepartments.some(
            (other) => other.id === department.id,
          ),
      ),
  );
  TestValidator.predicate(
    "organization two page 1 only contains org two departments",
    () =>
      organizationTwoList.data.every(
        (department) =>
          department.name.startsWith(orgTwoSeed) &&
          !organizationOneDepartments.some(
            (other) => other.id === department.id,
          ),
      ),
  );
  TestValidator.predicate(
    "organization two page 2 only contains org two departments",
    () =>
      organizationTwoSecondPage.data.every(
        (department) =>
          department.name.startsWith(orgTwoSeed) &&
          !organizationOneDepartments.some(
            (other) => other.id === department.id,
          ),
      ),
  );
  TestValidator.predicate(
    "organization one pagination is consistent",
    () =>
      organizationOneList.pagination.pages >= 2 &&
      organizationOneSecondPage.pagination.current === 2,
  );
  TestValidator.predicate(
    "organization two pagination is consistent",
    () =>
      organizationTwoList.pagination.pages >= 2 &&
      organizationTwoSecondPage.pagination.current === 2,
  );
}
