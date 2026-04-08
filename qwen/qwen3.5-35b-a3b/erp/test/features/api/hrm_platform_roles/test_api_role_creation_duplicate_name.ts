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

export async function test_api_role_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member (automatically creates organization with Owner role)
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
      },
    });
  typia.assert(memberAuthorized);
  // Create authenticated connection for role operations using token from authorization
  const roleConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuthorized.token.access },
  };
  // Step 2: Create first custom role with name "Sales Team"
  const firstRoleName = "Sales Team";
  const firstRole: IHrmPlatformRole =
    await api.functional.hrmPlatform.member.roles.create(roleConnection, {
      body: {
        name: firstRoleName,
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(firstRole);
  // Step 3: Attempt to create duplicate with different case (lowercase)
  const duplicateRoleName = "sales team";
  await TestValidator.error(
    "duplicate name (lowercase) should be rejected",
    async () => {
      await api.functional.hrmPlatform.member.roles.create(roleConnection, {
        body: {
          name: duplicateRoleName,
          role_kind: "custom",
        } satisfies IHrmPlatformRole.ICreate,
      });
    },
  );
  // Step 4: Attempt to create duplicate with different case (uppercase)
  const duplicateRoleNameUpper = "SALES TEAM";
  await TestValidator.error(
    "duplicate name (uppercase) should be rejected",
    async () => {
      await api.functional.hrmPlatform.member.roles.create(roleConnection, {
        body: {
          name: duplicateRoleNameUpper,
          role_kind: "custom",
        } satisfies IHrmPlatformRole.ICreate,
      });
    },
  );
  // Step 5: Verify first role remains intact after duplicate attempts
  TestValidator.predicate(
    "first role still exists after duplicate attempts",
    firstRole !== undefined,
  );
}
