import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_directory_permission_boundary(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const viewerConnection: api.IConnection = { host: connection.host };
  const deniedConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const viewer = await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(viewer);
  const denied = await authorize_member_join(deniedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(denied);
  const viewerAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: viewer.token.access },
  };
  const deniedAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: denied.token.access },
  };
  const body = {
    page: 1,
    limit: 20,
  } satisfies IErpHrmTimeEmployee.IRequest;
  const page = await api.functional.erpHrmTime.member.employees.index(
    viewerAuthorizedConnection,
    { body },
  );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data count within page limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate("data is an array", Array.isArray(page.data));
  await TestValidator.error(
    "employee directory denied without employee:view permission",
    async () => {
      await api.functional.erpHrmTime.member.employees.index(
        deniedAuthorizedConnection,
        { body },
      );
    },
  );
}
