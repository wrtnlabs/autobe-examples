import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that built-in roles (Owner, Manager, Employee) are automatically created
 * when a new member joins and creates their first organization.
 */
export async function test_api_role_list_with_built_in_roles(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member account with organization
  // The authorize_member_join utility creates a member and their first organization
  // Organization creation automatically creates built-in roles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Call roles list endpoint with no filters
  const response: IPageIErpHrmRole.ISummary =
    await api.functional.erpHrm.member.roles.index(memberConnection, {
      body: {} satisfies IErpHrmRole.IRequest,
    });
  // Step 3: Validate response structure (typia.assert validates all types)
  typia.assert(response);
  // Step 4: Verify pagination metadata
  TestValidator.equals(
    "pagination.current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.records should be 3",
    response.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination.pages should be 1",
    response.pagination.pages,
    1,
  );
  // Step 5: Verify exactly 3 roles returned
  TestValidator.equals(
    "data array should have 3 items",
    response.data.length,
    3,
  );
  // Step 6: Verify all roles are built-in
  TestValidator.predicate(
    "all roles should have isBuiltin=true",
    response.data.every((role) => role.isBuiltin === true),
  );
  // Step 7: Verify role names are the three built-in roles
  const roleNames = response.data.map((role) => role.name).sort();
  TestValidator.equals("role names should match", roleNames, [
    "Employee",
    "Manager",
    "Owner",
  ]);
}
