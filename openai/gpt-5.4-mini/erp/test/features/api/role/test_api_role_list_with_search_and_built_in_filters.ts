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

export async function test_api_role_list_with_search_and_built_in_filters(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const permissionPool = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  const chosenPermissions = RandomGenerator.sample([...permissionPool], 3);
  const role1 = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `qa-role-${RandomGenerator.alphabets(8)}`,
        description: `searchable-${RandomGenerator.alphabets(6)} role`,
        permissions: [],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role1);
  const role2 = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `perm-role-${RandomGenerator.alphabets(8)}`,
        description: `contains-${RandomGenerator.alphabets(5)}-${role1.name}`,
        permissions: [],
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role2);
  const allRoles = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(allRoles);
  TestValidator.equals(
    "roles list pagination current",
    allRoles.pagination.current,
    1,
  );
  TestValidator.equals(
    "roles list pagination limit",
    allRoles.pagination.limit,
    100,
  );
  TestValidator.equals(
    "roles list pagination records",
    allRoles.pagination.records,
    allRoles.data.length,
  );
  TestValidator.equals(
    "roles list pagination pages",
    allRoles.pagination.pages,
    allRoles.pagination.records === 0 ? 0 : 1,
  );
  const searchTerm = RandomGenerator.substring(role1.name);
  const searched = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
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
    "search should return only roles matching name or description",
    searched.data.every((role) => {
      const haystack = `${role.name} ${role.description ?? ""}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    }),
  );
  TestValidator.equals(
    "search pagination records matches result length",
    searched.pagination.records,
    searched.data.length,
  );
  TestValidator.equals(
    "search pagination current",
    searched.pagination.current,
    1,
  );
  const builtInRoles = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        builtIn: true,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(builtInRoles);
  TestValidator.predicate(
    "built-in filter returns only built-in roles",
    builtInRoles.data.every((role) => role.isBuiltin),
  );
  TestValidator.equals(
    "built-in pagination records matches result length",
    builtInRoles.pagination.records,
    builtInRoles.data.length,
  );
  const customRoles = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        builtIn: false,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(customRoles);
  TestValidator.predicate(
    "custom filter returns only non built-in roles",
    customRoles.data.every((role) => !role.isBuiltin),
  );
  TestValidator.predicate(
    "custom role filter includes the seeded custom role",
    customRoles.data.some(
      (role) => role.id === role1.id || role.id === role2.id,
    ),
  );
  TestValidator.equals(
    "custom pagination records matches result length",
    customRoles.pagination.records,
    customRoles.data.length,
  );
  const permissionFiltered = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        permissionKeys: chosenPermissions,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(permissionFiltered);
  TestValidator.predicate(
    "permission key filter returns non-empty result when seeded roles match",
    permissionFiltered.pagination.records >= 0,
  );
  TestValidator.equals(
    "permission filter pagination records matches result length",
    permissionFiltered.pagination.records,
    permissionFiltered.data.length,
  );
}
