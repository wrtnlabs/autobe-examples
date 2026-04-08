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

export async function test_api_role_list_organization_scoping_and_built_in_visibility(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: `P@ssw0rd-${RandomGenerator.alphabets(8)}` satisfies string,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const pageSize = 100 satisfies number;
  const firstPage = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: pageSize,
        sort: "createdAt",
        order: "asc",
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "role page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "role page limit should match request",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "role page records should cover returned data",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "role page pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "role list should include at least one built-in role",
    ArrayUtil.has(firstPage.data, (role) => role.isBuiltin),
  );
  TestValidator.predicate(
    "role list should not be empty after successful authentication",
    firstPage.data.length > 0,
  );
  TestValidator.predicate(
    "role list should contain only active roles",
    firstPage.data.every((role) => role.deletedAt === null),
  );
  const emptyPage = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        search: `__no_role_should_match__${RandomGenerator.alphabets(8)}`,
        page: 1,
        limit: 10,
        sort: "createdAt",
        order: "asc",
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty filtered role list should have zero records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filtered role list should have zero pages",
    emptyPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty filtered role list should have empty data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty filtered role list should return current page 1",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty filtered role list should preserve requested limit",
    emptyPage.pagination.limit,
    10,
  );
  const builtinOnly = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        isBuiltin: true,
        page: 1,
        limit: 100,
        sort: "createdAt",
        order: "asc",
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(builtinOnly);
  TestValidator.predicate(
    "builtin-only filter should return only built-in roles",
    builtinOnly.data.every((role) => role.isBuiltin),
  );
  TestValidator.predicate(
    "builtin-only filter should not be empty",
    builtinOnly.data.length > 0,
  );
  TestValidator.predicate(
    "builtin-only pagination should be consistent",
    builtinOnly.pagination.records >= builtinOnly.data.length,
  );
}
