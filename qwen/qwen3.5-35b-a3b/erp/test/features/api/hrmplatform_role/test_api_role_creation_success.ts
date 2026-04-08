import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function test_api_role_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (creates organization with Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const orgName = RandomGenerator.name();
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      org_name: orgName,
      org_currency: "USD",
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/app",
      referrer: "https://example.com/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create custom role using the authenticated member connection
  const roleName = `Custom Role ${RandomGenerator.alphabets(6)}`;
  const roleDescription = RandomGenerator.paragraph({ sentences: 1 });
  const role = await api.functional.hrmPlatform.member.roles.create(
    memberConnection,
    {
      body: {
        name: roleName,
        description: roleDescription,
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Validate role_kind is strictly 'custom'
  TestValidator.equals("role_kind is custom", role.role_kind, "custom");
  // 4. Validate role name matches input
  TestValidator.equals("name matches input", role.name, roleName);
  // 5. Validate description matches input
  TestValidator.equals(
    "description matches input",
    role.description,
    roleDescription,
  );
  // 6. Validate UUID format for role id
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate("role id is valid UUID", uuidRegex.test(role.id));
  // 7. Validate timestamps are ISO 8601 format
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/;
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    iso8601Regex.test(role.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    iso8601Regex.test(role.updated_at),
  );
  // 8. Validate organization reference exists and name matches registration
  TestValidator.predicate(
    "has organization reference",
    role.organization !== null,
  );
  TestValidator.equals(
    "organization name matches registration",
    role.organization.name,
    orgName,
  );
  // 9. Validate empty permissions array for new custom role
  TestValidator.equals(
    "permissions array is empty",
    role.permissions.length,
    0,
  );
  // 10. Test role name uniqueness - try creating duplicate role (case-insensitive)
  const duplicateRoleName = roleName.toUpperCase();
  await TestValidator.error("duplicate role name rejected", async () => {
    await api.functional.hrmPlatform.member.roles.create(memberConnection, {
      body: {
        name: duplicateRoleName,
        description: "Duplicate test",
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
}
