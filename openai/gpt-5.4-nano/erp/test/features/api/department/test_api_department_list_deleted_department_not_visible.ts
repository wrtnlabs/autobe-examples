import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IAutoBePaginationSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IAutoBePaginationSearch";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_departments_create";
import { prepare_random_erp_hrm_time_tracking_department } from "../../../prepare/prepare_random_erp_hrm_time_tracking_department";

export async function test_api_department_list_deleted_department_not_visible(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join to establish org context
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphaNumeric(10),
      referrer: "https://example.com/ref" + RandomGenerator.alphaNumeric(6),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(credentials);
  // 2) create department
  const departmentName = RandomGenerator.name();
  const createdDepartment =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: null,
          parent_department_id: null,
        },
      },
    );
  typia.assert(createdDepartment);
  // 3) delete department
  await api.functional.erpHrmTimeTracking.member.departments.erase(
    memberConnection,
    {
      departmentId: createdDepartment.id,
    },
  );
  // 4) list departments with search by deleted name
  const page = await api.functional.erpHrmTimeTracking.member.departments.index(
    memberConnection,
    {
      body: {
        search: null,
        name: departmentName,
        description: null,
        parent_department_id: null,
        sort: null,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(page);
  // 5) validate: deleted department not in list and others not deleted
  TestValidator.predicate(
    "deleted department not visible in list",
    () => !page.data.some((d) => d.id === createdDepartment.id),
  );
  TestValidator.predicate(
    "all returned departments are not marked deleted",
    () => page.data.every((d) => d.deleted_at === null),
  );
}
