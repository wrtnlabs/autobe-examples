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

export async function test_api_roles_filter_custom(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Login to get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: joinResponse.email,
      password: password,
    },
  });
  // 3. Create custom role
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Custom Role Alpha",
        description: "A custom role for testing",
        role_kind: "custom",
      },
    },
  );
  typia.assert(customRole);
  // 4. Query roles with role_kind=custom filter
  const customFilterParams = {
    role_kind: "custom",
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformRole.IRequest;
  const customFilterResult =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: customFilterParams,
    });
  typia.assert(customFilterResult);
  TestValidator.equals(
    "all roles are custom type",
    customFilterResult.data.every((role) => role.role_kind === "custom"),
    true,
  );
  TestValidator.equals(
    "custom role count includes newly created role",
    customFilterResult.data.some((role) => role.id === customRole.id),
    true,
  );
  // 5. Query roles with role_kind=built_in filter
  const builtInFilterParams = {
    role_kind: "built_in",
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformRole.IRequest;
  const builtInFilterResult =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: builtInFilterParams,
    });
  typia.assert(builtInFilterResult);
  TestValidator.equals(
    "all roles are built_in type",
    builtInFilterResult.data.every((role) => role.role_kind === "built_in"),
    true,
  );
  // Verify built-in roles contain expected system roles
  const builtInNames = builtInFilterResult.data.map((role) => role.name);
  TestValidator.equals(
    "includes Owner built-in role",
    builtInNames.includes("Owner"),
    true,
  );
  TestValidator.equals(
    "includes Manager built-in role",
    builtInNames.includes("Manager"),
    true,
  );
  TestValidator.equals(
    "includes Employee built-in role",
    builtInNames.includes("Employee"),
    true,
  );
  // 6. Test name prefix filter (case-sensitive)
  const namePrefixParams = {
    name: "Custom",
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformRole.IRequest;
  const namePrefixResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: namePrefixParams,
    },
  );
  typia.assert(namePrefixResult);
  TestValidator.equals(
    "name prefix filter returns matching roles",
    namePrefixResult.data.every((role) => role.name.startsWith("Custom")),
    true,
  );
  TestValidator.equals(
    "name prefix filter includes custom role with matching prefix",
    namePrefixResult.data.some((role) => role.id === customRole.id),
    true,
  );
  // Test case sensitivity - "custom" (lowercase) should not match "Custom Role Alpha"
  const caseSensitiveParams = {
    name: "custom",
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformRole.IRequest;
  const caseSensitiveResult =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: caseSensitiveParams,
    });
  typia.assert(caseSensitiveResult);
  TestValidator.equals(
    "case-sensitive filter excludes non-matching case",
    caseSensitiveResult.data.every((role) => !role.name.startsWith("custom")),
    true,
  );
  // 7. Test search field (case-insensitive) - search by name
  const searchParams = {
    search: "custom",
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformRole.IRequest;
  const searchResult = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: searchParams,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search returns role matching search term in name",
    searchResult.data.some((role) =>
      role.name.toLowerCase().includes("custom"),
    ),
    true,
  );
  // Add another custom role with description containing search term
  const customRole2 = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Test Role Beta",
        description: "This role contains custom permissions",
        role_kind: "custom",
      },
    },
  );
  typia.assert(customRole2);
  // Search by description
  const descriptionSearchParams = {
    search: "custom",
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformRole.IRequest;
  const descriptionSearchResult =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: descriptionSearchParams,
    });
  typia.assert(descriptionSearchResult);
  TestValidator.equals(
    "search returns role matching search term in description",
    descriptionSearchResult.data.some((role) => role.id === customRole2.id),
    true,
  );
  // 8. Verify permissions_count accuracy
  for (const role of customFilterResult.data) {
    TestValidator.predicate(
      `custom role ${role.id} has valid permissions_count`,
      role.permissions_count >= 0,
    );
  }
  for (const role of builtInFilterResult.data) {
    TestValidator.predicate(
      `built-in role ${role.id} has valid permissions_count`,
      role.permissions_count >= 0,
    );
  }
}
