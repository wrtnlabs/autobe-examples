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

/**
 * Test retrieving all roles within an organization including built-in and custom roles.
 *
 * This test validates:
 * 1. Member authentication via registration
 * 2. Role list retrieval with pagination metadata
 * 3. Built-in roles (Owner, Manager, Employee) have is_builtin=true
 * 4. All roles belong to the same organization
 * 5. At least one role exists in the organization
 */
export async function test_api_role_list_with_builtin_and_custom_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve role list with default pagination
  const roleList = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(roleList);
  // 3. Validate at least one role exists (built-in roles should always exist)
  TestValidator.predicate(
    "at least one role exists in organization",
    roleList.data.length > 0,
  );
  // 4. Validate built-in role names have is_builtin=true
  const builtinRoleNames = ["Owner", "Manager", "Employee"];
  for (const role of roleList.data) {
    if (builtinRoleNames.includes(role.name)) {
      TestValidator.equals(
        `built-in role "${role.name}" should have is_builtin=true`,
        role.is_builtin,
        true,
      );
    }
  }
  // 5. Verify all roles belong to same organization
  const firstOrgId = roleList.data[0].organization.id;
  for (const role of roleList.data) {
    TestValidator.equals(
      `role "${role.name}" belongs to same organization`,
      role.organization.id,
      firstOrgId,
    );
  }
}
