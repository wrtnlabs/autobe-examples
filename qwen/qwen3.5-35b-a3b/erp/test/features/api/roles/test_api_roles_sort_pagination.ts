import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_roles_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to establish authentication context
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(joinResult);
  // 2. Create custom connections for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: joinResult.token.access };
  // 3. Create multiple custom roles to test sorting and pagination
  const createdRoles: IHrmPlatformRole.ICreate[] = [];
  for (let i = 0; i < 25; i++) {
    const roleName = `Custom Role ${i + 1}`;
    const role = await api.functional.hrmPlatform.member.roles.create(
      memberConnection,
      {
        body: {
          name: roleName,
          description: `Description for ${roleName}`,
          role_kind: "custom",
        } satisfies IHrmPlatformRole.ICreate,
      },
    );
    typia.assert(role);
    createdRoles.push({
      name: roleName,
      description: `Description for ${roleName}`,
      role_kind: "custom",
    } as IHrmPlatformRole.ICreate);
  }
  // 4. Test sorting by name (ascending)
  const nameAscResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        sort: "name",
        order: "asc",
        limit: 5,
        page: 1,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(nameAscResult);
  // Verify name ascending order
  const nameAscData = nameAscResult.data;
  TestValidator.equals("name ascending: count", nameAscData.length, 5);
  for (let i = 1; i < nameAscData.length; i++) {
    TestValidator.predicate(
      `name ascending: role ${i} name >= role ${i - 1}`,
      nameAscData[i].name >= nameAscData[i - 1].name,
    );
  }
  // 5. Test sorting by name (descending)
  const nameDescResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        sort: "name",
        order: "desc",
        limit: 5,
        page: 1,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(nameDescResult);
  // Verify name descending order
  const nameDescData = nameDescResult.data;
  TestValidator.equals("name descending: count", nameDescData.length, 5);
  for (let i = 1; i < nameDescData.length; i++) {
    TestValidator.predicate(
      `name descending: role ${i} name <= role ${i - 1}`,
      nameDescData[i].name <= nameDescData[i - 1].name,
    );
  }
  // 6. Test sorting by created_at (ascending) - SKIPPED: created_at not available on ISummary
  await api.functional.hrmPlatform.member.roles.index(memberConnection, {
    body: {
      sort: "created_at",
      order: "asc",
      limit: 5,
      page: 1,
    } satisfies IHrmPlatformRole.IRequest,
  });
  // 7. Test sorting by created_at (descending) - SKIPPED: created_at not available on ISummary
  await api.functional.hrmPlatform.member.roles.index(memberConnection, {
    body: {
      sort: "created_at",
      order: "desc",
      limit: 5,
      page: 1,
    } satisfies IHrmPlatformRole.IRequest,
  });
  // 8. Test sorting by updated_at (ascending) - SKIPPED: updated_at not available on ISummary
  await api.functional.hrmPlatform.member.roles.index(memberConnection, {
    body: {
      sort: "updated_at",
      order: "asc",
      limit: 5,
      page: 1,
    } satisfies IHrmPlatformRole.IRequest,
  });
  // 9. Test sorting by updated_at (descending) - SKIPPED: updated_at not available on ISummary
  await api.functional.hrmPlatform.member.roles.index(memberConnection, {
    body: {
      sort: "updated_at",
      order: "desc",
      limit: 5,
      page: 1,
    } satisfies IHrmPlatformRole.IRequest,
  });
  // 10. Test pagination with limit=1 (minimum)
  const limit1Result = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(limit1Result);
  // Validate pagination metadata for limit=1
  TestValidator.equals("limit=1: data length", limit1Result.data.length, 1);
  TestValidator.equals(
    "limit=1: current page",
    limit1Result.pagination.current,
    1,
  );
  TestValidator.equals("limit=1: limit", limit1Result.pagination.limit, 1);
  TestValidator.predicate(
    "limit=1: records >= 25",
    limit1Result.pagination.records >= 25,
  );
  TestValidator.equals(
    "limit=1: pages calculation",
    limit1Result.pagination.pages,
    Math.ceil(limit1Result.pagination.records / 1),
  );
  // 11. Test pagination with limit=20 (default)
  const limit20Result = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(limit20Result);
  // Validate pagination metadata for limit=20
  TestValidator.equals("limit=20: data length", limit20Result.data.length, 20);
  TestValidator.equals(
    "limit=20: current page",
    limit20Result.pagination.current,
    1,
  );
  TestValidator.equals("limit=20: limit", limit20Result.pagination.limit, 20);
  TestValidator.predicate(
    "limit=20: records >= 25",
    limit20Result.pagination.records >= 25,
  );
  TestValidator.equals(
    "limit=20: pages calculation",
    limit20Result.pagination.pages,
    Math.ceil(limit20Result.pagination.records / 20),
  );
  // 12. Test pagination with limit=100 (maximum)
  const limit100Result = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(limit100Result);
  // Validate pagination metadata for limit=100
  TestValidator.equals(
    "limit=100: data length",
    limit100Result.data.length,
    25,
  );
  TestValidator.equals(
    "limit=100: current page",
    limit100Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=100: limit",
    limit100Result.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit=100: records",
    limit100Result.pagination.records,
    25,
  );
  TestValidator.equals("limit=100: pages", limit100Result.pagination.pages, 1);
  // 13. Test page 2 with limit=5
  const page2Result = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        limit: 5,
        page: 2,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(page2Result);
  // Validate page 2 pagination
  TestValidator.equals("page 2: data length", page2Result.data.length, 5);
  TestValidator.equals(
    "page 2: current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2: limit", page2Result.pagination.limit, 5);
  TestValidator.equals("page 2: records", page2Result.pagination.records, 25);
  TestValidator.equals("page 2: pages", page2Result.pagination.pages, 5);
  // 14. Test last page with limit=5 (should have 0 items for 25 records, 5 pages)
  const lastPageResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        limit: 5,
        page: 5,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(lastPageResult);
  // Validate last page
  TestValidator.equals("last page: data length", lastPageResult.data.length, 5);
  TestValidator.equals(
    "last page: current page",
    lastPageResult.pagination.current,
    5,
  );
  TestValidator.equals("last page: pages", lastPageResult.pagination.pages, 5);
  // 15. Test built-in roles are included by default
  const allRolesResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(allRolesResult);
  // Verify built-in roles exist in results
  const builtInRoles = allRolesResult.data.filter(
    (role) => role.role_kind === "built_in",
  );
  TestValidator.predicate("built-in roles included", builtInRoles.length > 0);
  // 16. Test custom roles filter
  const customRolesResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        role_kind: "custom",
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(customRolesResult);
  // Verify only custom roles returned
  TestValidator.equals(
    "custom roles: count",
    customRolesResult.data.length,
    25,
  );
  for (const role of customRolesResult.data) {
    TestValidator.predicate(
      `custom role ${role.name} has correct kind`,
      role.role_kind === "custom",
    );
  }
  // 17. Test built-in roles filter
  const builtInRolesOnlyResult =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: {
        role_kind: "built_in",
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(builtInRolesOnlyResult);
  // Verify only built-in roles returned
  TestValidator.predicate(
    "built-in roles filter returns built-in roles",
    builtInRolesOnlyResult.data.length > 0,
  );
  for (const role of builtInRolesOnlyResult.data) {
    TestValidator.predicate(
      `built-in role ${role.name} has correct kind`,
      role.role_kind === "built_in",
    );
  }
}