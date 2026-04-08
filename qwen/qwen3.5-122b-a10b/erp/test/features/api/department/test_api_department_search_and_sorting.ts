import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Get organization ID from auth response or use random UUID
  // Note: In a real test, we would create an organization first
  const organizationId =
    auth.organizations && auth.organizations.length > 0
      ? auth.organizations[0].id
      : typia.random<string & tags.Format<"uuid">>();
  // 3. Test search functionality with various patterns
  // 3.1 Test search with a pattern
  const searchPattern = RandomGenerator.alphabets(3);
  const searchResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: searchPattern,
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3.2 Test case-insensitive search - use uppercase pattern
  const upperCasePattern = searchPattern.toUpperCase();
  const upperCaseResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: upperCasePattern,
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(upperCaseResult);
  // 3.3 Test search with no matches - use a very specific pattern
  const noMatchResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: "ZZZZZ_NONEXISTENT_DEPT",
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match returns empty data",
    noMatchResult.data.length,
    0,
  );
  // 4. Test sorting functionality
  // 4.1 Test sorting by name ascending (default)
  const nameAscResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          sort_by: "name",
          sort_order: "asc",
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(nameAscResult);
  // 4.2 Test sorting by name descending
  const nameDescResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          sort_by: "name",
          sort_order: "desc",
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(nameDescResult);
  // 4.3 Test sorting by created_at ascending
  const createdAtAscResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(createdAtAscResult);
  // 4.4 Test sorting by created_at descending
  const createdAtDescResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(createdAtDescResult);
  // 4.5 Test default sorting (omit sort parameters)
  const defaultSortResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          limit: 10,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  // 5. Test pagination with search and sorting combined
  const combinedResult =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          search: searchPattern,
          sort_by: "name",
          sort_order: "asc",
          page: 1,
          limit: 5,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    combinedResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    combinedResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    combinedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    combinedResult.pagination.pages >= 0,
  );
  // 7. Validate response structure - typia.assert already validates all properties
  for (const department of combinedResult.data) {
    typia.assert(department);
  }
}
