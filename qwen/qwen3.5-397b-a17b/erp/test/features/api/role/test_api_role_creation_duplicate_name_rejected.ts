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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test that duplicate role name creation is rejected within an organization.
 *
 * Validates the business rule that role names must be unique within an organization. A member authenticates, creates an organization, creates an initial custom role with a specific name, then attempts to create another role with the same name. The test ensures the system enforces the unique constraint on organization_id and name combination.
 *
 * This test covers the scenario where an administrator attempts to create a custom role that duplicates an existing custom role name. The system should reject this operation to maintain data integrity and prevent role assignment ambiguity.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Member creates a new organization as the owner.
 * 3. Member creates a custom role with a specific name (e.g., "Custom Manager").
 * 4. Member attempts to create another role with the identical name.
 * 5. Validates that the duplicate creation attempt is rejected with an error.
 */
export async function test_api_role_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create initial custom role with specific name
  const roleName = "Custom Manager";
  const firstRole = await api.functional.hrmPlatform.member.roles.create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: roleName,
        description: "First custom role with this name",
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(firstRole);
  // 4. Attempt to create duplicate role with same name
  await TestValidator.error("duplicate role name rejected", async () => {
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        organization_id: organization.id,
        name: roleName,
        description: "Duplicate role name attempt",
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
}
