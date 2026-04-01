import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_role_list_organization_scope_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  const allowedConnection: api.IConnection = { host: connection.host };
  const allowedJoin = await authorize_member_join(allowedConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `Aa1!${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(allowedJoin);
  const allowedRoles = await generate_random_erp_hrm_time_member_roles_create(
    allowedConnection,
    {
      body: {
        name: `role_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(allowedRoles);
  const allowedPage = await api.functional.erpHrmTime.member.roles.index(
    allowedConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: ["+name"],
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(allowedPage);
  TestValidator.predicate(
    "allowed role list has at least one role",
    allowedPage.data.length > 0,
  );
  TestValidator.predicate(
    "allowed role list pagination is consistent",
    allowedPage.pagination.records >= allowedPage.data.length,
  );
  TestValidator.predicate(
    "created role is visible in the allowed organization scope",
    allowedPage.data.some((role) => role.id === allowedRoles.id),
  );
  const deniedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(deniedConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `Aa1!${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.error(
    "member without the required organization role access cannot list roles",
    async () => {
      await api.functional.erpHrmTime.member.roles.index(deniedConnection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeRole.IRequest,
      });
    },
  );
  const switchedConnection: api.IConnection = { host: connection.host };
  const switchedJoin = await authorize_member_join(switchedConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `Aa1!${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(switchedJoin);
  const switchedRole = await generate_random_erp_hrm_time_member_roles_create(
    switchedConnection,
    {
      body: {
        name: `role_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(switchedRole);
  const switchedPage = await api.functional.erpHrmTime.member.roles.index(
    switchedConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(switchedPage);
  TestValidator.predicate(
    "switched role list is also organization scoped",
    switchedPage.data.every(
      (role) => role.organization === switchedPage.data[0]?.organization,
    ),
  );
  TestValidator.predicate(
    "switching organization context changes the visible role set",
    switchedPage.data.some((role) => role.id === switchedRole.id) &&
      !allowedPage.data.some((role) => role.id === switchedRole.id),
  );
}
