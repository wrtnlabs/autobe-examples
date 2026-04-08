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

/**
 * Test retrieving a built-in role within the authenticated member's organization.
 *
 * Validates the complete role retrieval flow including member authentication and role data access. Ensures that the role endpoint returns properly structured data with organization context, role identification, built-in flag, and timestamps.
 *
 * Special attention is given to verifying that the response conforms to IHrmPlatformRole type with all required fields including the organization summary, role name, isBuiltIn boolean flag, and creation/update timestamps.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member retrieves a role by its UUID identifier.
 * 3. Validates role response contains complete entity structure via typia.assert().
 * 4. Verifies isBuiltIn flag is true confirming this is a system-provided built-in role.
 */
export async function test_api_role_retrieve_builtin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Retrieve role by UUID
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const role = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    {
      roleId,
    },
  );
  typia.assert(role);
  // 3. Validate isBuiltIn flag confirms system-provided role
  TestValidator.predicate("is built-in role", role.isBuiltIn === true);
}
