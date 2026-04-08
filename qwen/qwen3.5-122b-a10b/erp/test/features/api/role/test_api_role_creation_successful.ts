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

export async function test_api_role_creation_successful(
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
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Organization context
  // Note: In a complete test flow, an organization would be created first
  // and the member would be added to it. For this role creation test,
  // we assume the member has organization access.
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error(
      "Member must have at least one organization to test role creation. " +
        "Please ensure organization setup is completed before running this test.",
    );
  }
  const organizationId = memberAuth.organizations[0].id;
  // 3. Create custom role with unique name and description
  const roleName = `TestRole_${RandomGenerator.alphabets(8)}`;
  const roleDescription = `Automatically generated test role ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const createdRole =
    await api.functional.hrm.member.organizations.roles.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          name: roleName,
          description: roleDescription,
        } satisfies IHrmRole.ICreate,
      },
    );
  typia.assert(createdRole);
  // 4. Validate role properties
  TestValidator.equals("role name matches input", createdRole.name, roleName);
  TestValidator.equals(
    "role description matches input",
    createdRole.description,
    roleDescription,
  );
  TestValidator.predicate(
    "role is custom (not builtin)",
    createdRole.is_builtin === false,
  );
  TestValidator.predicate(
    "role has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdRole.id,
    ),
  );
  TestValidator.predicate(
    "role has organization reference",
    createdRole.organization !== null && createdRole.organization !== undefined,
  );
  TestValidator.equals(
    "organization ID matches",
    createdRole.organization.id,
    organizationId,
  );
  TestValidator.predicate(
    "role has created_at timestamp",
    createdRole.created_at !== null && createdRole.created_at !== undefined,
  );
  TestValidator.predicate(
    "role has updated_at timestamp",
    createdRole.updated_at !== null && createdRole.updated_at !== undefined,
  );
  TestValidator.predicate(
    "role has permissions array",
    Array.isArray(createdRole.permissions) &&
      createdRole.permissions.length > 0,
  );
}
