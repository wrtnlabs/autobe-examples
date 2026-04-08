import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test filtering roles to retrieve only built-in system roles.
 *
 * Validates the is_built_in filter functionality on the role list endpoint. After authenticating as a member, the test calls the roles list endpoint with is_built_in filter set to true and verifies that only the three system-provided roles (Owner, Manager, Employee) are returned.
 *
 * The test ensures that all returned roles have is_built_in=true, confirms no custom roles appear in the filtered results, and validates that pagination metadata correctly reflects the filtered record count of 3 built-in roles.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Calls roles list endpoint with is_built_in=true filter.
 * 3. Validates response structure and pagination metadata.
 * 4. Verifies exactly 3 roles are returned (Owner, Manager, Employee).
 * 5. Confirms all roles have is_built_in=true flag set.
 * 6. Validates role names match expected built-in role names.
 */
export async function test_api_role_list_filter_built_in_roles_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Call roles list with is_built_in=true filter
  const response = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_built_in: true,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.equals("total records", response.pagination.records, 3);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  // 4. Validate exactly 3 roles returned
  TestValidator.equals("role count", response.data.length, 3);
  // 5. Validate all roles have is_built_in=true
  for (const role of response.data) {
    TestValidator.predicate(
      `role ${role.name} is built-in`,
      role.is_built_in === true,
    );
  }
  // 6. Validate role names are Owner, Manager, Employee
  const roleNames = response.data.map((role) => role.name).sort();
  const expectedNames = ["Employee", "Manager", "Owner"].sort();
  TestValidator.equals("built-in role names", roleNames, expectedNames);
}
