import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_permission_catalog_organization_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const name = RandomGenerator.name();
  const href = "https://example.com/erp/member/permissions";
  const referrer = "https://example.com/erp/landing";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      name,
      href,
      referrer,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const permissions = await api.functional.erpHrmTime.member.permissions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        order: "asc",
      } satisfies IErpHrmTimePermission.IRequest,
    },
  );
  typia.assert(permissions);
  TestValidator.predicate(
    "permission catalog should not be empty for an authorized member",
    permissions.data.length > 0,
  );
  TestValidator.predicate(
    "permission catalog should include canonical organization permission keys",
    permissions.data.some((item) => item.key === "org:manage"),
  );
  TestValidator.predicate(
    "permission catalog should include employee permissions",
    permissions.data.some((item) => item.key === "employee:view"),
  );
  TestValidator.predicate(
    "permission catalog should include project permissions",
    permissions.data.some((item) => item.key === "project:view"),
  );
  TestValidator.equals(
    "pagination current page should be one",
    permissions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should reflect request",
    permissions.pagination.limit,
    100,
  );
  await TestValidator.error(
    "base connection without organization-scoped authorization should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.permissions.index(connection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimePermission.IRequest,
      });
    },
  );
}
