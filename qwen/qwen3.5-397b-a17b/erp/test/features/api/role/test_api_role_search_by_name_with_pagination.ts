import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_search_by_name_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Search for roles with partial name match (case-insensitive)
  // Search for "Man" to find roles like "Manager"
  const searchResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        search: "Man",
        page: 1,
        limit: 10,
        sort: "name",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    searchResult.pagination.pages >= 0,
  );
  // Validate all returned roles contain the search term (case-insensitive)
  for (const role of searchResult.data) {
    typia.assert(role);
    TestValidator.predicate(
      `role name contains search term: ${role.name}`,
      role.name.toLowerCase().includes("man".toLowerCase()),
    );
    TestValidator.predicate("role has valid id", role.id.length > 0);
    TestValidator.predicate(
      "role has organization",
      role.organization !== undefined,
    );
  }
  // 3. Test pagination with different page and limit
  const paginatedResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        search: "Man",
        page: 1,
        limit: 5,
        sort: "created_at",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Validate pagination respects limit
  TestValidator.predicate(
    "data length respects limit",
    paginatedResult.data.length <= paginatedResult.pagination.limit,
  );
  // 4. Test edge case: search with no matching roles
  const noMatchResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(20), // Unique string that won't match
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(noMatchResult);
  // Validate empty result
  TestValidator.equals("no match returns empty data", noMatchResult.data, []);
  TestValidator.equals(
    "no match has zero records",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match has zero pages",
    noMatchResult.pagination.pages,
    0,
  );
  // 5. Test sorting by different fields
  const sortedByName = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "name",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortedByName);
  const sortedByCreatedAt = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);
  const sortedByIsBuiltin = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "is_builtin",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortedByIsBuiltin);
  // 6. Test filtering by is_builtin status
  const builtinRoles = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_builtin: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(builtinRoles);
  // All returned roles should be builtin
  for (const role of builtinRoles.data) {
    typia.assert(role);
    TestValidator.equals("role is builtin", role.is_builtin, true);
  }
  const customRoles = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_builtin: false,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(customRoles);
  // All returned roles should be custom (non-builtin)
  for (const role of customRoles.data) {
    typia.assert(role);
    TestValidator.equals("role is custom", role.is_builtin, false);
  }
}
