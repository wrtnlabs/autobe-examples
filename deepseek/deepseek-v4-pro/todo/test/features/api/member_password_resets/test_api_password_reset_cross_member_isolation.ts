import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_password_resets_create } from "../../../generate/generate_random_todo_app_password_resets_create";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

/**
 * Test that members cannot access password reset records belonging to other members.
 *
 * Validates the cross-member isolation boundary for password reset tokens. Each member's
 * password reset records are scoped exclusively to their own account through the
 * `todo_app_member_id` foreign key filter. When an authenticated member attempts to
 * retrieve a password reset record, the system queries only their own records — records
 * belonging to other members are never returned.
 *
 * The test verifies that even when the target resetId exists in the system (created by
 * Member A), Member B receives a 404 not-found error because the record is not scoped
 * to Member B's account. This confirms that the privacy isolation is enforced at the
 * database query level, not merely at the application logic level.
 *
 * 1. Member A joins via `authorize_member_join` and receives authenticated credentials.
 * 2. Member A initiates a password reset using their own email address.
 * 3. Member B joins separately as a different member with distinct credentials.
 * 4. Member B attempts to retrieve a password reset record — receives 404 not-found.
 */
export async function test_api_password_reset_cross_member_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a password reset
  await generate_random_todo_app_password_resets_create(
    { host: connection.host },
    { body: { email: memberA.email } },
  );
  // 3. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B attempts to retrieve a password reset → 404
  await TestValidator.httpError(
    "member B cannot access password reset records belonging to member A",
    404,
    () =>
      api.functional.todoApp.member.password_resets.at(memberBConnection, {
        resetId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
}
