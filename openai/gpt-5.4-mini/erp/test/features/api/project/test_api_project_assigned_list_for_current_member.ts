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

export async function test_api_project_assigned_list_for_current_member(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const page = await api.functional.erpHrmTime.member.projects.assigned.index(
    memberConnection,
    {
      body: {
        search: RandomGenerator.alphabets(3),
        sort: "+name",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeProject.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "assigned projects are unique by id",
    new Set(page.data.map((project) => project.id)).size,
    page.data.length,
  );
  TestValidator.predicate(
    "assigned projects response is paginated",
    page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "projects list does not exceed requested limit",
    page.data.length <= 10,
  );
  const emptyPage =
    await api.functional.erpHrmTime.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IErpHrmTimeProject.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page returns no data", emptyPage.data.length, 0);
}
