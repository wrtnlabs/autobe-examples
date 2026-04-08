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

export async function test_api_role_update_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResponse);
  // 2. Create new connection for authenticated role operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(adminConnection, {
    body: {
      email: authResponse.email,
      password: "TestPassword123!",
    },
  });
  // 3. Create first custom role with name 'SalesManager'
  const roleA = await api.functional.hrmPlatform.member.roles.create(
    adminConnection,
    {
      body: {
        name: "SalesManager",
        description: "First sales manager role",
        role_kind: "custom" as const,
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(roleA);
  // 4. Create second custom role with name 'HRManager'
  const roleB = await api.functional.hrmPlatform.member.roles.create(
    adminConnection,
    {
      body: {
        name: "HRManager",
        description: "First HR manager role",
        role_kind: "custom" as const,
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(roleB);
  // 5. Attempt to update role B to 'SalesManager' (duplicate, case variation)
  // This should fail with a uniqueness validation error
  await TestValidator.error(
    "should reject duplicate name case-insensitive",
    async () => {
      await api.functional.hrmPlatform.member.roles.update(adminConnection, {
        roleId: roleB.id,
        body: {
          name: "SalesManager",
        } satisfies IHrmPlatformRole.IUpdate,
      });
    },
  );
  // 6. Verify role B's name is still 'HRManager' by re-fetching
  const roleBAfter = await api.functional.hrmPlatform.member.roles.update(
    adminConnection,
    {
      roleId: roleB.id,
      body: {
        name: "HRManager",
      } satisfies IHrmPlatformRole.IUpdate,
    },
  );
  typia.assert(roleBAfter);
  TestValidator.equals(
    "role B name unchanged after failed update attempt",
    roleBAfter.name,
    "HRManager",
  );
  // 7. Inverse test: update role A to 'hrmanager' (lowercase version of role B's name)
  await TestValidator.error(
    "should reject duplicate name inverse",
    async () => {
      await api.functional.hrmPlatform.member.roles.update(adminConnection, {
        roleId: roleA.id,
        body: {
          name: "hrmanager",
        } satisfies IHrmPlatformRole.IUpdate,
      });
    },
  );
  // 8. Verify role A's name is still 'SalesManager' after failed update
  const roleAAfter = await api.functional.hrmPlatform.member.roles.update(
    adminConnection,
    {
      roleId: roleA.id,
      body: {
        name: "SalesManager",
      } satisfies IHrmPlatformRole.IUpdate,
    },
  );
  typia.assert(roleAAfter);
  TestValidator.equals(
    "role A name unchanged after failed update attempt",
    roleAAfter.name,
    "SalesManager",
  );
  // 9. Test valid unique name update succeeds
  const validUpdate = await api.functional.hrmPlatform.member.roles.update(
    adminConnection,
    {
      roleId: roleB.id,
      body: {
        name: "SeniorSalesManager",
      } satisfies IHrmPlatformRole.IUpdate,
    },
  );
  typia.assert(validUpdate);
  TestValidator.equals(
    "valid unique name update succeeds",
    validUpdate.name,
    "SeniorSalesManager",
  );
}
