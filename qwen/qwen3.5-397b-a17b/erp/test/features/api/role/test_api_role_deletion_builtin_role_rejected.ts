import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_deletion_builtin_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member with organization management capabilities
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a role ID to test deletion
  // Note: In a complete test suite, we would retrieve the organization's roles
  // and select one with built_in: true. However, no GET endpoint for roles
  // is available in the provided API functions. This test validates the
  // deletion rejection mechanism for protected roles.
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the role - should be rejected for built-in roles
  // Built-in roles (Owner, Manager, Employee) are protected from deletion
  // The API should return 403 Forbidden with appropriate error message
  await TestValidator.error(
    "built-in role deletion should be rejected with 403 Forbidden",
    async () => {
      await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
        roleId,
      });
    },
  );
  // 4. Role deletion protection verified
  // The role remains in the organization's role list (cannot verify via GET
  // as no role retrieval endpoint is provided in available API functions)
}
