import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_project_list_filtered_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const search = RandomGenerator.alphabets(3);
  const request = {
    search,
    status: "active",
    sort: "name",
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeProject.IRequest;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/signup" as string & tags.Format<"uri">,
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const projects = await api.functional.erpHrmTime.member.projects.index(
    memberConnection,
    { body: request },
  );
  typia.assert(projects);
  const repeated = await api.functional.erpHrmTime.member.projects.index(
    memberConnection,
    { body: request },
  );
  typia.assert(repeated);
  TestValidator.equals(
    "pagination current page should match request",
    projects.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    projects.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    projects.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    projects.pagination.pages >= 0,
  );
  TestValidator.equals(
    "repeated query should return same pagination metadata",
    repeated.pagination,
    projects.pagination,
  );
  TestValidator.equals(
    "repeated query should return same project ordering",
    repeated.data.map((item) => item.id),
    projects.data.map((item) => item.id),
  );
  TestValidator.predicate(
    "all returned projects should satisfy active status filter",
    projects.data.every((project) => project.status === request.status),
  );
  TestValidator.predicate(
    "all returned projects should be within page limit",
    projects.data.length <= request.limit,
  );
  TestValidator.predicate(
    "search keyword should match project name or description when available",
    projects.data.every(
      (project) =>
        project.name.includes(search) ||
        (project.description !== null && project.description.includes(search)),
    ),
  );
  TestValidator.predicate(
    "project sorting by name should be stable across repeated requests",
    projects.data.every(
      (project, index) => project.id === repeated.data[index]?.id,
    ),
  );
}
