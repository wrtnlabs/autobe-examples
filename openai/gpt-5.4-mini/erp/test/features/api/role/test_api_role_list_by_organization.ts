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

export async function test_api_role_list_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const customRole = await generate_random_erp_hrm_time_member_roles_create(
    organizationConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(customRole);
  const firstPage = await api.functional.erpHrmTime.member.roles.index(
    organizationConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("pagination current", firstPage.pagination.current, 1);
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 100);
  TestValidator.predicate(
    "pagination records should be at least the returned count",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "custom role should be in the organization role list",
    ArrayUtil.has(firstPage.data, (role) => role.id === customRole.id),
  );
  TestValidator.predicate(
    "built-in roles should be present in the organization role list",
    ArrayUtil.has(firstPage.data, (role) => role.isBuiltin),
  );
  TestValidator.predicate(
    "all returned roles should share the active organization reference",
    firstPage.data.every(
      (role) => role.organization === customRole.organization,
    ),
  );
  const searchTerm = customRole.name.slice(
    0,
    Math.max(1, Math.min(3, customRole.name.length)),
  );
  const searched = await api.functional.erpHrmTime.member.roles.index(
    organizationConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(searched);
  TestValidator.predicate(
    "search should find the custom role by name",
    ArrayUtil.has(searched.data, (role) => role.id === customRole.id),
  );
  TestValidator.predicate(
    "search should not alter built-in filtering semantics",
    searched.data.every(
      (role) => role.organization === customRole.organization,
    ),
  );
  const builtInOnly = await api.functional.erpHrmTime.member.roles.index(
    organizationConnection,
    {
      body: {
        builtIn: true,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(builtInOnly);
  TestValidator.predicate(
    "builtIn filter should return only built-in roles",
    builtInOnly.data.every((role) => role.isBuiltin),
  );
  TestValidator.predicate(
    "built-in roles should include at least one canonical baseline role",
    ArrayUtil.has(builtInOnly.data, (role) =>
      ["Owner", "Manager", "Employee"].includes(role.name),
    ),
  );
  const customOnly = await api.functional.erpHrmTime.member.roles.index(
    organizationConnection,
    {
      body: {
        builtIn: false,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(customOnly);
  TestValidator.predicate(
    "builtIn false filter should return only custom roles",
    customOnly.data.every((role) => !role.isBuiltin),
  );
  TestValidator.predicate(
    "custom role should appear in custom role filter",
    ArrayUtil.has(customOnly.data, (role) => role.id === customRole.id),
  );
}
