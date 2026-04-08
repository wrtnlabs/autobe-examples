import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Verify member has organizations available
  // This test requires at least one organization to exist for the member
  TestValidator.predicate(
    "member has at least one organization",
    memberAuth.organizations !== undefined &&
      memberAuth.organizations.length > 0,
  );
  const organizationId = memberAuth.organizations![0].id;
  // 3. Test default pagination (page 1, pageSize 20)
  const page1Response =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(page1Response);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );
  // 5. Validate employee summary structure for each returned employee
  for (const employee of page1Response.data) {
    typia.assert(employee);
    // Verify required fields exist
    TestValidator.predicate("employee has id", employee.id !== undefined);
    TestValidator.predicate(
      "employee has position",
      employee.position !== undefined,
    );
    TestValidator.predicate(
      "employee has employment_type",
      employee.employment_type !== undefined,
    );
    TestValidator.predicate(
      "employee has status",
      employee.status !== undefined,
    );
    TestValidator.predicate("employee has user", employee.user !== undefined);
    TestValidator.predicate(
      "employee has organization",
      employee.organization !== undefined,
    );
    TestValidator.predicate("employee has role", employee.role !== undefined);
    TestValidator.predicate(
      "employee has created_at",
      employee.created_at !== undefined,
    );
    // Verify nested user summary structure
    TestValidator.predicate("user has id", employee.user.id !== undefined);
    TestValidator.predicate(
      "user has email",
      employee.user.email !== undefined,
    );
    TestValidator.predicate(
      "user has created_at",
      employee.user.created_at !== undefined,
    );
    // Verify nested organization summary structure
    TestValidator.predicate(
      "organization has id",
      employee.organization.id !== undefined,
    );
    TestValidator.predicate(
      "organization has name",
      employee.organization.name !== undefined,
    );
  }
  // 6. Test maximum page size (100)
  const maxPageSizeResponse =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          pageSize: 100,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(maxPageSizeResponse);
  TestValidator.equals(
    "max page size limit",
    maxPageSizeResponse.pagination.limit,
    100,
  );
  // 7. Test pagination with page 2 (if more than one page exists)
  if (page1Response.pagination.pages > 1) {
    const page2Response =
      await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
        memberConnection,
        {
          organizationId,
          body: {
            page: 2,
            pageSize: 20,
          } satisfies IHrmEmployee.IRequest,
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "pagination current page 2",
      page2Response.pagination.current,
      2,
    );
  }
  // 8. Test filtering by status (active employees)
  const activeOnlyResponse =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          pageSize: 20,
          status: "active",
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(activeOnlyResponse);
  // Verify all returned employees have active status
  for (const employee of activeOnlyResponse.data) {
    TestValidator.equals("employee is active", employee.status, "active");
  }
  // 9. Test sorting by created_at descending (default)
  const sortedResponse =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          pageSize: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Verify employees are sorted by created_at descending
  if (sortedResponse.data.length > 1) {
    for (let i = 0; i < sortedResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `employee ${i} created_at >= employee ${i + 1} created_at`,
        sortedResponse.data[i].created_at >=
          sortedResponse.data[i + 1].created_at,
      );
    }
  }
  // 10. Test empty result with non-existent filter
  const emptyResponse =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          pageSize: 20,
          status: "deactivated",
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response has correct pagination",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response has empty data array",
    emptyResponse.data.length,
    0,
  );
}
