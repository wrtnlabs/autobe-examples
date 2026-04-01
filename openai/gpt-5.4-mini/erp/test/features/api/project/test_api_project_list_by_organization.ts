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

export async function test_api_project_list_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerAConnection: api.IConnection = { host: connection.host };
  const ownerBConnection: api.IConnection = { host: connection.host };
  const ownerA = await authorize_member_join(ownerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/join/a",
      referrer: "https://example.com/erp/referrer/a",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerA);
  ownerAConnection.headers = {
    ...(ownerAConnection.headers ?? {}),
    Authorization: ownerA.token.access,
  };
  const ownerB = await authorize_member_join(ownerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/join/b",
      referrer: "https://example.com/erp/referrer/b",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerB);
  ownerBConnection.headers = {
    ...(ownerBConnection.headers ?? {}),
    Authorization: ownerB.token.access,
  };
  const firstOrgProjects =
    await api.functional.erpHrmTime.member.projects.index(ownerAConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeProject.IRequest,
    });
  typia.assert(firstOrgProjects);
  const secondOrgProjects =
    await api.functional.erpHrmTime.member.projects.index(ownerBConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeProject.IRequest,
    });
  typia.assert(secondOrgProjects);
  TestValidator.equals(
    "default pagination current page",
    firstOrgProjects.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    firstOrgProjects.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "default paging returns records array",
    firstOrgProjects.data.length <= firstOrgProjects.pagination.limit,
  );
  TestValidator.predicate(
    "summary fields exist for each project",
    firstOrgProjects.data.every(
      (project) =>
        (typeof project.id === "string" &&
          typeof project.name === "string" &&
          typeof project.description === "string") ||
        project.description === null,
    ),
  );
  TestValidator.predicate(
    "project summaries include required display fields",
    firstOrgProjects.data.every(
      (project) =>
        (typeof project.colorCode === "string" &&
          typeof project.status === "string" &&
          (project.startDate === null ||
            typeof project.startDate === "string") &&
          (project.endDate === null || typeof project.endDate === "string") &&
          typeof project.budgetHours === "number") ||
        (project.budgetHours === null &&
          typeof project.organization === "object"),
    ),
  );
  TestValidator.predicate(
    "projects belong only to the active organization",
    firstOrgProjects.data.every(
      (project) =>
        !secondOrgProjects.data.some((other) => other.id === project.id),
    ),
  );
  const activeProjects = await api.functional.erpHrmTime.member.projects.index(
    ownerAConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeProject.IRequest,
    },
  );
  typia.assert(activeProjects);
  TestValidator.predicate(
    "status filter returns only active projects",
    activeProjects.data.every((project) => project.status === "active"),
  );
  const searchKeyword =
    firstOrgProjects.data.length > 0
      ? firstOrgProjects.data[0].name.slice(
          0,
          Math.max(1, Math.min(4, firstOrgProjects.data[0].name.length)),
        )
      : RandomGenerator.alphabets(3);
  const searchedProjects =
    await api.functional.erpHrmTime.member.projects.index(ownerAConnection, {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeProject.IRequest,
    });
  typia.assert(searchedProjects);
  TestValidator.predicate(
    "search returns only matching projects in the active organization",
    searchedProjects.data.every(
      (project) =>
        project.name.includes(searchKeyword) ||
        (project.description !== null &&
          project.description.includes(searchKeyword)),
    ),
  );
  TestValidator.predicate(
    "search results stay within the selected organization",
    searchedProjects.data.every(
      (project) =>
        !secondOrgProjects.data.some((other) => other.id === project.id),
    ),
  );
}
