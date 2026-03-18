import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const firstPage = await api.functional.hrmTimeTracking.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data within limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const secondPage =
    await api.functional.hrmTimeTracking.member.employees.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IHrmTimeTrackingEmployee.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "second page data within limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  const defaultSortPage =
    await api.functional.hrmTimeTracking.member.employees.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingEmployee.IRequest,
      },
    );
  typia.assert(defaultSortPage);
  TestValidator.equals(
    "default sort records",
    defaultSortPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "default sort pages",
    defaultSortPage.pagination.pages,
    Math.ceil(
      defaultSortPage.pagination.records / defaultSortPage.pagination.limit,
    ),
  );
  TestValidator.predicate(
    "default sort data within limit",
    defaultSortPage.data.length <= defaultSortPage.pagination.limit,
  );
  const unsupportedSortPage =
    await api.functional.hrmTimeTracking.member.employees.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "unsupported_sort_key",
        } satisfies IHrmTimeTrackingEmployee.IRequest,
      },
    );
  typia.assert(unsupportedSortPage);
  TestValidator.equals(
    "unsupported sort preserves record count",
    unsupportedSortPage.pagination.records,
    defaultSortPage.pagination.records,
  );
  TestValidator.equals(
    "unsupported sort preserves page count",
    unsupportedSortPage.pagination.pages,
    defaultSortPage.pagination.pages,
  );
  TestValidator.predicate(
    "unsupported sort keeps data within limit",
    unsupportedSortPage.data.length <= unsupportedSortPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination metadata stays consistent",
    unsupportedSortPage.pagination.limit,
    10,
  );
}
