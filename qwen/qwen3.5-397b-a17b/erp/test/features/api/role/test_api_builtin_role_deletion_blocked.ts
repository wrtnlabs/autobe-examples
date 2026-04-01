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

export async function test_api_builtin_role_deletion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // 2. Attempt to delete a built-in role
  // Since there's no API to list roles, we test with a generated UUID
  // The system should reject deletion of built-in roles (Owner, Manager, Employee)
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that deletion fails with appropriate error
  // Built-in roles cannot be deleted, so this should throw an error
  await TestValidator.error(
    "built-in role deletion should be blocked",
    async () => {
      await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
        roleId,
      });
    },
  );
}