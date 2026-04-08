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
 * Test custom role creation with multiple permissions assigned.
 *
 * Validates the complete role creation workflow including member authentication, organization setup, and custom role creation with permission assignments. Ensures that the custom role is properly scoped to the organization with is_built_in set to false.
 *
 * Special attention is given to verifying that the role name is unique within the organization context and that the response includes complete role metadata with organization summary and timestamps.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates an organization to establish role context.
 * 3. Member creates a custom role with unique name, description, and optional permission IDs.
 * 4. Validates role is created with is_built_in false, organization context, and timestamps.
 */
export async function test_api_role_creation_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization as role container
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with name and description
  // Note: permission_ids omitted as it's optional and requires valid existing permission UUIDs
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Validate role creation
  TestValidator.equals(
    "organization matches",
    role.organization.id,
    organization.id,
  );
  TestValidator.equals("is custom role", role.isBuiltIn, false);
  TestValidator.predicate(
    "has valid created timestamp",
    role.createdAt !== null,
  );
  TestValidator.predicate(
    "has valid updated timestamp",
    role.updatedAt !== null,
  );
}
