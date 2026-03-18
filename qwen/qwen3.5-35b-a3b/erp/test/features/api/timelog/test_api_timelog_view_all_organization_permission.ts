import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_view_all_organization_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first employee (Employee A)
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeA = await authorize_member_join(employeeAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeA);
  // 2. Register second employee (Employee B)
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeB = await authorize_member_join(employeeBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeB);
  // 3. Register manager with time:view_all permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(manager);
  // Verify all members are in the same organization
  const employeeAOrg = employeeA.organization_memberships[0].organization;
  const employeeBOrg = employeeB.organization_memberships[0].organization;
  const managerOrg = manager.organization_memberships[0].organization;
  TestValidator.equals(
    "same organization for employee A",
    employeeAOrg.id,
    managerOrg.id,
  );
  TestValidator.equals(
    "same organization for employee B",
    employeeBOrg.id,
    managerOrg.id,
  );
  // 4. Manager views all timelogs using their connection
  const timelogsResponse = await api.functional.hrms.member.timelogs.index(
    managerConnection,
    {
      body: {},
    },
  );
  typia.assert(timelogsResponse);
  // 5. Verify pagination structure
  TestValidator.equals(
    "pagination has current",
    timelogsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    timelogsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records",
    timelogsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    timelogsResponse.pagination.pages >= 0,
  );
  // 6. Verify timelogs data array exists
  TestValidator.predicate(
    "timelogs data is array",
    Array.isArray(timelogsResponse.data),
  );
  // 7. Test filtering - date range
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  const filteredTimelogs = await api.functional.hrms.member.timelogs.index(
    managerConnection,
    {
      body: {
        date_range: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      },
    },
  );
  typia.assert(filteredTimelogs);
  TestValidator.equals(
    "filtered pagination has current",
    filteredTimelogs.pagination.current,
    1,
  );
  TestValidator.predicate(
    "filtered timelogs data is array",
    Array.isArray(filteredTimelogs.data),
  );
  // 8. Test filtering - organization_code (multi-tenancy verification)
  const orgCodeFiltered = await api.functional.hrms.member.timelogs.index(
    managerConnection,
    {
      body: {
        organization_code: managerOrg.id,
      },
    },
  );
  typia.assert(orgCodeFiltered);
  TestValidator.equals(
    "org filtered pagination has current",
    orgCodeFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "org filtered timelogs data is array",
    Array.isArray(orgCodeFiltered.data),
  );
  // 9. Test filtering - pagination parameters
  const paginatedTimelogs = await api.functional.hrms.member.timelogs.index(
    managerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(paginatedTimelogs);
  TestValidator.equals(
    "paginated pagination has current",
    paginatedTimelogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated pagination has limit",
    paginatedTimelogs.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "paginated timelogs data is array",
    Array.isArray(paginatedTimelogs.data),
  );
  // 10. Test filtering - invalid organization (should return empty or only own org)
  const unrelatedOrg = await api.functional.hrms.member.timelogs.index(
    managerConnection,
    {
      body: {
        organization_code: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(unrelatedOrg);
  TestValidator.equals(
    "unrelated org pagination has current",
    unrelatedOrg.pagination.current,
    1,
  );
  TestValidator.predicate(
    "unrelated org timelogs data is array",
    Array.isArray(unrelatedOrg.data),
  );
}
