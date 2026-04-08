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

export async function test_api_department_list_search_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` as string,
      password: "P@ssw0rd123!" as string,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const firstPage = await api.functional.erpHrmTime.member.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeDepartment.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current is at least 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    firstPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  const ascByName = await api.functional.erpHrmTime.member.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IErpHrmTimeDepartment.IRequest,
    },
  );
  typia.assert(ascByName);
  const descByName = await api.functional.erpHrmTime.member.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "name",
        sortOrder: "desc",
      } satisfies IErpHrmTimeDepartment.IRequest,
    },
  );
  typia.assert(descByName);
  const ascNames = ascByName.data.map((department) => department.name);
  const sortedAscNames = [...ascNames].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "departments are sorted by name ascending",
    ascNames,
    sortedAscNames,
  );
  const descNames = descByName.data.map((department) => department.name);
  const sortedDescNames = [...descNames].sort((a, b) => b.localeCompare(a));
  TestValidator.equals(
    "departments are sorted by name descending",
    descNames,
    sortedDescNames,
  );
  const ascByCreatedAt =
    await api.functional.erpHrmTime.member.departments.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "asc",
      } satisfies IErpHrmTimeDepartment.IRequest,
    });
  typia.assert(ascByCreatedAt);
  const descByCreatedAt =
    await api.functional.erpHrmTime.member.departments.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IErpHrmTimeDepartment.IRequest,
    });
  typia.assert(descByCreatedAt);
  const ascCreatedAt = ascByCreatedAt.data.map(
    (department) => department.created_at,
  );
  const sortedAscCreatedAt = [...ascCreatedAt].sort((a, b) =>
    a.localeCompare(b),
  );
  TestValidator.equals(
    "departments are sorted by createdAt ascending",
    ascCreatedAt,
    sortedAscCreatedAt,
  );
  const descCreatedAt = descByCreatedAt.data.map(
    (department) => department.created_at,
  );
  const sortedDescCreatedAt = [...descCreatedAt].sort((a, b) =>
    b.localeCompare(a),
  );
  TestValidator.equals(
    "departments are sorted by createdAt descending",
    descCreatedAt,
    sortedDescCreatedAt,
  );
  const searchSource = firstPage.data[0]?.name ?? "";
  if (searchSource.length > 0) {
    const searchTerm = searchSource.slice(
      0,
      Math.max(1, Math.min(3, searchSource.length)),
    );
    const searched = await api.functional.erpHrmTime.member.departments.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          search: searchTerm,
        } satisfies IErpHrmTimeDepartment.IRequest,
      },
    );
    typia.assert(searched);
    TestValidator.predicate(
      "search results match the search term",
      searched.data.every((department) => department.name.includes(searchTerm)),
    );
  }
  const parentCandidate = firstPage.data.find(
    (department) => department.parentDepartment !== null,
  );
  if (parentCandidate !== undefined && parentCandidate.parentDepartment !== null) {
    const parentDepartment = parentCandidate.parentDepartment;
    const filteredByParent =
      await api.functional.erpHrmTime.member.departments.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 100,
            parentDepartmentId: parentDepartment.id,
          } satisfies IErpHrmTimeDepartment.IRequest,
        },
      );
    typia.assert(filteredByParent);
    TestValidator.predicate(
      "parent filter returns only direct children",
      filteredByParent.data.every(
        (department) =>
          department.parentDepartment !== null &&
          department.parentDepartment.id === parentDepartment.id,
      ),
    );
  }
  TestValidator.predicate(
    "parentDepartment is only populated for immediate parents",
    firstPage.data.every(
      (department) =>
        department.parentDepartment === null ||
        department.parentDepartment.id !== department.id,
    ),
  );
}
