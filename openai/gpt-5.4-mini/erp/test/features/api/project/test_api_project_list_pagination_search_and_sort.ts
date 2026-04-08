import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_list_pagination_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorization);
  const firstPage = await api.functional.erpHrmTime.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
        sort: "+name",
      } satisfies IErpHrmTimeProject.IRequest,
    },
  );
  typia.assert(firstPage);
  const secondPage = await api.functional.erpHrmTime.member.projects.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
        sort: "+name",
      } satisfies IErpHrmTimeProject.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination should use the requested page size on first page",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination should use the requested page size on second page",
    secondPage.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination should advance to the first page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should advance to the second page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pages should not contain duplicate projects",
    firstPage.data.every(
      (left) => !secondPage.data.some((right) => right.id === left.id),
    ),
  );
  TestValidator.predicate(
    "first page should be sorted by name when enough records exist",
    firstPage.data.length < 2 ||
      firstPage.data[0].name <= firstPage.data[1].name,
  );
  if (firstPage.data.length > 0) {
    const source = firstPage.data[0].description ?? firstPage.data[0].name;
    const keyword =
      source.length >= 3 ? RandomGenerator.substring(source) : source;
    const searched = await api.functional.erpHrmTime.member.projects.index(
      memberConnection,
      {
        body: {
          search: keyword,
          page: 1,
          limit: 10,
          sort: "+name",
        } satisfies IErpHrmTimeProject.IRequest,
      },
    );
    typia.assert(searched);
    TestValidator.predicate(
      "search should return only matching projects",
      searched.data.every(
        (project) =>
          project.name.includes(keyword) ||
          (project.description ?? "").includes(keyword),
      ),
    );
    TestValidator.predicate(
      "search should not increase the result set beyond the full first page when filtered",
      searched.pagination.records <= firstPage.pagination.records,
    );
  }
}
