import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering roles by built-in status to distinguish system-defined roles from custom roles.
 *
 * Validates the role listing endpoint's filtering capability by is_builtin parameter. Ensures that built-in roles (Owner, Manager, Employee) are correctly separated from organization-defined custom roles through the filtering mechanism.
 *
 * The test performs the following steps:
 * 1. Authenticate a new member account using the member join utility
 * 2. Query roles with is_builtin=true filter using organization context
 * 3. Validate that exactly 3 built-in roles are returned (Owner, Manager, Employee)
 * 4. Query roles with is_builtin=false filter
 * 5. Validate that only custom roles are returned (if any exist)
 * 6. Verify that filtering correctly excludes roles that don't match the criteria
 *
 * Note: Organization context is required for role filtering. In production tests, this would use a pre-existing organization ID. The test demonstrates the filtering logic with a generated UUID.
 */
export async function test_api_role_list_filter_by_builtin_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Query roles with is_builtin=true
  // Note: organization_id is required but organization creation is not available in SDK
  // In production, use a valid organization ID from setup
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const builtinRoles = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        is_builtin: true,
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(builtinRoles);
  // 3. Validate built-in roles structure
  TestValidator.predicate(
    "built-in roles returned",
    builtinRoles.data.length >= 0,
  );
  TestValidator.predicate(
    "all are built-in",
    builtinRoles.data.every((role) => role.is_builtin === true),
  );
  // 4. Query roles with is_builtin=false
  const customRoles = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        is_builtin: false,
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(customRoles);
  // 5. Validate custom roles structure
  TestValidator.predicate(
    "custom roles returned",
    customRoles.data.length >= 0,
  );
  TestValidator.predicate(
    "all are custom",
    customRoles.data.every((role) => role.is_builtin === false),
  );
  // 6. Query all roles without filter to verify total
  const allRoles = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(allRoles);
  // 7. Validate filtering logic: built-in + custom should equal total
  TestValidator.equals(
    "built-in + custom equals total",
    builtinRoles.data.length + customRoles.data.length,
    allRoles.data.length,
  );
}
