import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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

/**
 * Test retrieving a custom role created within the authenticated member's organization.
 *
 * Validates the complete custom role retrieval workflow including member authentication, custom role creation, and role retrieval by UUID. Ensures that custom roles are properly distinguished from built-in roles and that all role attributes are correctly returned.
 *
 * Special attention is given to verifying that the isBuiltIn flag is set to false for custom roles, the name and description match the creation request, and the organization context is properly maintained throughout the role lifecycle.
 *
 * 1. Member authenticates via join endpoint to obtain valid session.
 * 2. Creates a custom role with specific name and description using the role creation endpoint.
 * 3. Retrieves the newly created custom role by its UUID.
 * 4. Validates isBuiltIn flag is false, name and description match creation input, organization context is correct, and timestamps are properly formatted.
 */
export async function test_api_role_retrieve_custom(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a custom role with specific name and description
  const roleName = RandomGenerator.paragraph({ sentences: 1 });
  const roleDescription = RandomGenerator.content({ paragraphs: 2 });
  const createdRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: roleName,
        description: roleDescription,
      },
    },
  );
  typia.assert(createdRole);
  // 3. Retrieve the custom role by its UUID
  const retrievedRole = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    {
      roleId: createdRole.id,
    },
  );
  typia.assert(retrievedRole);
  // 4. Validate custom role properties
  TestValidator.equals("role ID matches", retrievedRole.id, createdRole.id);
  TestValidator.equals("role name matches", retrievedRole.name, roleName);
  TestValidator.predicate(
    "role description matches",
    retrievedRole.description === roleDescription,
  );
  TestValidator.predicate(
    "isBuiltIn flag is false for custom role",
    retrievedRole.isBuiltIn === false,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedRole.organization.id,
    createdRole.organization.id,
  );
  TestValidator.predicate(
    "createdAt timestamp is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedRole.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt timestamp is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedRole.updatedAt,
    ),
  );
}
