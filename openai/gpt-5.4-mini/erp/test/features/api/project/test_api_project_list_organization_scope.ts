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

export async function test_api_project_list_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const page = await api.functional.erpHrmTime.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.alphabets(3),
        status: "active",
        sort: "+created_at",
      } satisfies IErpHrmTimeProject.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "records cover the returned page data",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "page data is a list of project summaries",
    page.data.every((project) => {
      typia.assert(project);
      return (
        typeof project.id === "string" &&
        typeof project.name === "string" &&
        typeof project.colorCode === "string" &&
        typeof project.status === "string" &&
        project.organization.id.length > 0
      );
    }),
  );
  TestValidator.predicate(
    "projects belong to the active organization scope returned by the API",
    page.data.every(
      (project) => project.organization.id === page.data[0]?.organization.id,
    ),
  );
  TestValidator.predicate(
    "deleted projects are not included in the visible list",
    page.data.every((project) => project.deletedAt === null),
  );
  const filtered = await api.functional.erpHrmTime.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: page.data[0]?.name ?? RandomGenerator.alphabets(3),
        status: page.data[0]?.status ?? "active",
        sort: "+created_at",
      } satisfies IErpHrmTimeProject.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered results remain within the same organization scope",
    filtered.data.every(
      (project) => project.organization.id === page.data[0]?.organization.id,
    ),
  );
  TestValidator.predicate(
    "filtered page metadata remains consistent",
    filtered.pagination.current === 1 &&
      filtered.pagination.limit === 10 &&
      filtered.pagination.records >= filtered.data.length &&
      filtered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "search and status filters return matching projects when results exist",
    filtered.data.every(
      (project) =>
        (project.status === (page.data[0]?.status ?? "active") &&
          project.name.includes(page.data[0]?.name ?? "")) ||
        filtered.data.length === 0,
    ),
  );
}
