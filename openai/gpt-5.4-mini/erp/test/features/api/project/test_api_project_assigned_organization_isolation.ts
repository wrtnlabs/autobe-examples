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

export async function test_api_project_assigned_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const assigned =
    await api.functional.erpHrmTime.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeProject.IRequest,
      },
    );
  typia.assert(assigned);
  TestValidator.equals(
    "assigned project page current",
    assigned.pagination.current,
    1,
  );
  TestValidator.equals(
    "assigned project page limit",
    assigned.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "assigned project pagination is non-negative",
    assigned.pagination.records >= 0 && assigned.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "assigned project result is a list",
    Array.isArray(assigned.data),
  );
  TestValidator.predicate(
    "assigned project list items are scoped summaries",
    assigned.data.every(
      (project) =>
        typeof project.id === "string" && typeof project.name === "string",
    ),
  );
  const searched =
    await api.functional.erpHrmTime.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          search: RandomGenerator.alphabets(12),
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeProject.IRequest,
      },
    );
  typia.assert(searched);
  TestValidator.equals(
    "unrelated search should not leak assigned projects from another organization",
    searched.data.length,
    0,
  );
  const invalidContextConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid-token" },
  };
  await TestValidator.httpError(
    "missing or invalid organization context should be rejected",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.projects.assigned.index(
        invalidContextConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeProject.IRequest,
        },
      );
    },
  );
}
