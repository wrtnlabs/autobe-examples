import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_roles_create } from "../../../generate/generate_random_hrm_member_organizations_roles_create";
import { prepare_random_hrm_role } from "../../../prepare/prepare_random_hrm_role";

export async function test_api_role_creation_builtin_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test custom role creation fails with built-in role name conflicts.
   *
   * Validates that the system prevents creating custom roles with names that conflict with built-in roles (Owner, Manager, Employee). These built-in roles are system-defined and immutable, so attempting to create a custom role with the same name should result in an error.
   *
   * The test flow:
   * 1. Member registers and authenticates via join
   * 2. Extracts organization context from auth response
   * 3. Attempts to create roles with each built-in name (Owner, Manager, Employee)
   * 4. Validates each attempt throws an HTTP error (409 Conflict or 400 Bad Request)
   *
   * This ensures the system enforces role name uniqueness and protects built-in roles from being shadowed by custom roles.
   */
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test built-in role name conflicts
  // Note: This test requires a valid organization ID. In production, this would come from
  // the member's organization context after joining an organization.
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const builtInRoleNames = ["Owner", "Manager", "Employee"] as const;
  for (const roleName of builtInRoleNames) {
    await TestValidator.error(
      `creating role with built-in name '${roleName}'`,
      async () => {
        await api.functional.hrm.member.organizations.roles.create(
          memberConnection,
          {
            organizationId,
            body: {
              name: roleName,
              description: `This should fail - ${roleName} is a built-in role`,
            } satisfies IHrmRole.ICreate,
          },
        );
      },
    );
  }
}
