import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_list_filter_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create a custom role
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          {
            permission: "employee:view",
          } satisfies IHrmPlatformRolePermission.ICreate,
        ],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // 4. Get roles with built_in=true (should return only built-in roles)
  const builtInRolesResponse =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: {
        built_in: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(builtInRolesResponse);
  // 5. Verify built_in=true returns only built-in roles (no custom roles)
  TestValidator.predicate("built_in=true returns only built-in roles", () =>
    builtInRolesResponse.data.every((role) => role.built_in === true),
  );
  TestValidator.predicate(
    "built_in=true excludes custom roles",
    () => !builtInRolesResponse.data.some((role) => role.id === customRole.id),
  );
  TestValidator.predicate(
    "built_in=true has at least 3 built-in roles",
    () => builtInRolesResponse.data.length >= 3,
  );
  // 6. Get roles with built_in=false (should return only custom roles)
  const customRolesResponse =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: {
        built_in: false,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(customRolesResponse);
  // 7. Verify built_in=false returns only custom roles
  TestValidator.predicate("built_in=false returns only custom roles", () =>
    customRolesResponse.data.every((role) => role.built_in === false),
  );
  TestValidator.predicate("built_in=false includes created custom role", () =>
    customRolesResponse.data.some((role) => role.id === customRole.id),
  );
  // 8. Validate pagination metadata
  TestValidator.equals(
    "built_in pagination current page",
    builtInRolesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination current page",
    customRolesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "built_in pagination records match data length",
    () =>
      builtInRolesResponse.pagination.records >=
      builtInRolesResponse.data.length,
  );
  TestValidator.predicate(
    "custom pagination records match data length",
    () =>
      customRolesResponse.pagination.records >= customRolesResponse.data.length,
  );
}
