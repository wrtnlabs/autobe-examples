import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function test_api_role_list_search_and_builtin_filter(
  connection: api.IConnection,
): Promise<void> {
  const joined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: null,
        href: "https://example.com/erp",
        referrer: "https://example.com/",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(joined);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${joined.token.access}` },
  };
  const unfiltered = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(unfiltered);
  TestValidator.predicate(
    "role list should include pagination metadata",
    unfiltered.pagination.current >= 0 &&
      unfiltered.pagination.limit >= 0 &&
      unfiltered.pagination.records >= 0 &&
      unfiltered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "role list should not be empty in a seeded organization",
    unfiltered.data.length > 0,
  );
  const builtinRole = unfiltered.data.find((role) => role.isBuiltin);
  TestValidator.predicate(
    "organization should expose at least one built-in role",
    builtinRole !== undefined,
  );
  if (builtinRole === undefined) return;
  const keyword =
    builtinRole.name.length > 2
      ? builtinRole.name.substring(0, 2)
      : builtinRole.name;
  const filtered = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        search: keyword,
        isBuiltin: true,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered result should preserve pagination metadata",
    filtered.pagination.current >= 0 &&
      filtered.pagination.limit >= 0 &&
      filtered.pagination.records >= 0 &&
      filtered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "built-in filter should exclude custom roles",
    filtered.data.every((role) => role.isBuiltin),
  );
  TestValidator.predicate(
    "search should match returned role names",
    filtered.data.every((role) => role.name.includes(keyword)),
  );
  TestValidator.predicate(
    "all returned roles should belong to the same organization context",
    filtered.data.every(
      (role) => role.organization.id === unfiltered.data[0]!.organization.id,
    ),
  );
  TestValidator.predicate(
    "filtered result should be a subset of the unfiltered role list",
    filtered.data.every((role) =>
      unfiltered.data.some((origin) => origin.id === role.id),
    ),
  );
}
