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

/**
 * Test complete replacement of role permissions with a different permission set.
 *
 * Validates that updating role permissions replaces all existing permissions rather than adding to them. A member user joins, creates a custom role, assigns an initial set of permissions, then updates with a completely different set. The test confirms that original permissions are removed and only the new permissions remain assigned to the role.
 *
 * This test validates the atomic nature of permission updates and ensures the minimum one permission constraint is enforced. The response must accurately reflect the current permission state after each update operation.
 *
 * 1. Member user joins and authenticates with email and password.
 * 2. Member creates a custom role within their organization.
 * 3. Member updates role permissions with an initial set of permission IDs.
 * 4. Member updates role permissions with a completely different set of permission IDs.
 * 5. Validates that the final permission set matches the second update exactly.
 * 6. Validates that original permissions from the first update are no longer assigned.
 */
export async function test_api_role_permissions_complete_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
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
  // Get organization ID from the response
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must belong to at least one organization");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 2. Create custom role
  const role = await generate_random_hrm_member_organizations_roles_create(
    memberConnection,
    {
      params: { organizationId },
      body: {
        name: `Custom Role ${RandomGenerator.alphabets(5)}`,
        description: "Test role for permission replacement",
      } satisfies IHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Update permissions with first set
  const firstPermissionIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    3,
    () => typia.random<string & tags.Format<"uuid">>(),
  ) satisfies (string & tags.Format<"uuid">)[];
  const updatedWithFirst =
    await api.functional.hrm.member.roles.permissions.update(memberConnection, {
      roleId: role.id,
      body: {
        permission_ids: firstPermissionIds,
      } satisfies IHrmRole.IUpdatePermission,
    });
  typia.assert(updatedWithFirst);
  // 4. Update permissions with completely different second set
  const secondPermissionIds: (string & tags.Format<"uuid">)[] =
    ArrayUtil.repeat(3, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ) satisfies (string & tags.Format<"uuid">)[];
  // Ensure second set is different from first
  const allDifferent = firstPermissionIds.every(
    (id) => !secondPermissionIds.includes(id),
  );
  if (!allDifferent) {
    throw new Error(
      "Second permission set must be completely different from first",
    );
  }
  const updatedWithSecond =
    await api.functional.hrm.member.roles.permissions.update(memberConnection, {
      roleId: role.id,
      body: {
        permission_ids: secondPermissionIds,
      } satisfies IHrmRole.IUpdatePermission,
    });
  typia.assert(updatedWithSecond);
  // 5. Validate that permissions were completely replaced
  TestValidator.equals(
    "role permissions replaced with second set",
    updatedWithSecond.permissions.map((p) => p.id).sort(),
    secondPermissionIds.sort(),
  );
  // 6. Validate that original permissions are no longer assigned
  TestValidator.equals(
    "original permissions removed from role",
    updatedWithSecond.permissions.length,
    secondPermissionIds.length,
  );
}
