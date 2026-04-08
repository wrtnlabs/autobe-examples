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
 * Test successful update of a custom role within an organization.
 *
 * Validates that organization owners can modify both the name and description of custom roles they created. The test follows the complete workflow of member authentication, organization context selection, role creation, and role update with comprehensive validation of the updated values and timestamps.
 *
 * This test ensures that:
 * - Custom roles are mutable by organization owners
 * - Organization owner permission is enforced for role updates
 * - Response includes all role fields with correct timestamps
 * - The updated_at timestamp changes after modification
 *
 * 1. Authenticate as member via join endpoint.
 * 2. Extract organization from the authorized response (member must have at least one organization).
 * 3. Create a custom role with initial name and description.
 * 4. Update the role with new name and description values.
 * 5. Verify the response contains the updated name and description.
 * 6. Verify updated_at timestamp is different from created_at.
 */
export async function test_api_role_update_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Get organization from authorized response
  if (!authorized.organizations || authorized.organizations.length === 0) {
    throw new Error("Member must have at least one organization");
  }
  const organization = authorized.organizations[0];
  // 3. Create a custom role with initial name and description
  const initialName = `Role_${RandomGenerator.alphabets(8)}`;
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdRole: IHrmRole =
    await generate_random_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
        } satisfies IHrmRole.ICreate,
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(createdRole);
  // Store original timestamps for comparison
  const originalUpdatedAt = createdRole.updated_at;
  // 4. Update the role with new name and description
  const updatedName = `UpdatedRole_${RandomGenerator.alphabets(8)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedRole: IHrmRole =
    await api.functional.hrm.member.organizations.roles.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: createdRole.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IHrmRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // 5. Verify the response contains updated values
  TestValidator.equals("role name updated", updatedRole.name, updatedName);
  TestValidator.equals(
    "role description updated",
    updatedRole.description,
    updatedDescription,
  );
  // 6. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedRole.updated_at,
    originalUpdatedAt,
  );
  // Additional validations
  TestValidator.equals("role id preserved", updatedRole.id, createdRole.id);
  TestValidator.equals(
    "organization id preserved",
    updatedRole.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "is_builtin is false",
    updatedRole.is_builtin === false,
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedRole.created_at === createdRole.created_at,
  );
}
