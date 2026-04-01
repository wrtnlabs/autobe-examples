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

export async function test_api_project_list_access_control_and_empty_result(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberAuth);
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "member without project:view permission should be rejected",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.projects.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeProject.IRequest,
        },
      );
    },
  );
  const emptyConnection: api.IConnection = { host: connection.host };
  const emptyAuth = await authorize_member_join(emptyConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(emptyAuth);
  const page = await api.functional.erpHrmTime.member.projects.index(
    emptyConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeProject.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("empty project list data", page.data.length, 0);
  TestValidator.equals(
    "empty project list records",
    page.pagination.records,
    0,
  );
  TestValidator.equals("empty project list pages", page.pagination.pages, 0);
  TestValidator.equals(
    "empty project list current page",
    page.pagination.current,
    1,
  );
  TestValidator.equals("empty project list limit", page.pagination.limit, 10);
}
