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
 * Test password reset initiation for a registered member.
 *
 * Validates that a registered member can initiate a password reset by submitting
 * their email address through the public password-resets endpoint. The system
 * must accept the request and return a void response without disclosing any
 * sensitive information such as the reset token or revealing whether the email
 * address is registered in the system.
 *
 * 1. Create a registered member account via the join endpoint to obtain a known
 *    valid email address in the system.
 * 2. Initiate a password reset by submitting the member's registered email
 *    through the password-resets endpoint.
 * 3. Verify the API returns successfully with no data in the response body,
 *    confirming the uniform void response pattern that prevents user enumeration
 *    attacks and token leakage.
 */
export async function test_api_password_reset_initiate_for_registered_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a registered member with known email
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Initiate password reset with the member's email
  await generate_random_todo_app_password_resets_create(connection, {
    body: { email: member.email },
  });
  // Success: void response confirms no sensitive data is leaked
}
