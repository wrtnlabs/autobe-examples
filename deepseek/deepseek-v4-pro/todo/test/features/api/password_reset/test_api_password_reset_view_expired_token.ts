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
 * Test retrieval of an expired password reset record for audit visibility.
 *
 * Validates that the system returns the complete password reset record — including
 * the token value, expired_at timestamp, and all lifecycle metadata — even after
 * the token's expiration period has elapsed. The record must remain retrievable so
 * the client can inspect the expired_at field and display appropriate guidance
 * (e.g., "This reset link has expired. Please request a new one.") rather than
 * receiving a 404 or seeing the record hidden.
 *
 * The expired_at timestamp is confirmed to reflect a point in the past, enabling
 * the client to programmatically distinguish expired tokens from still-valid ones.
 *
 * 1. A member joins and authenticates with randomized credentials.
 * 2. A password reset is created for the member's registered email address.
 * 3. The member retrieves the password reset record by its identifier.
 * 4. The full ITodoAppMemberPasswordReset structure is validated via typia.assert.
 * 5. Confirms expired_at is a timestamp in the past relative to the current time.
 */
export async function test_api_password_reset_view_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a password reset for the member's email
  await generate_random_todo_app_password_resets_create(memberConnection, {
    body: { email: member.email },
  });
  // 3. Retrieve the password reset record by ID
  const resetRecord = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    {
      resetId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(resetRecord);
  // 4. Verify expired_at reflects a past timestamp (token is expired)
  TestValidator.predicate(
    "expired_at is in the past",
    new Date(resetRecord.expired_at).getTime() < Date.now(),
  );
}
