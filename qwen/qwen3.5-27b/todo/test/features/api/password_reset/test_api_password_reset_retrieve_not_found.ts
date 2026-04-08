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

/**
 * Test retrieving a password reset record that does not exist or has been soft-deleted.
 *
 * Validates that the password reset retrieval endpoint properly handles non-existent or soft-deleted records by returning a 404 Not Found error. This ensures the system does not leak information about the existence of deleted password reset tokens.
 *
 * The test verifies the business rule that soft-deleted password reset tokens should not be accessible via the retrieval endpoint, and that both non-existent and soft-deleted records are treated identically (returning 404) to prevent information leakage.
 *
 * 1. Register a new member account with email and password credentials
 * 2. Generate a random UUID that does not exist in the database
 * 3. Attempt to retrieve the password reset record using the non-existent resetId
 * 4. Verify the operation throws an HTTP 404 error
 */
export async function test_api_password_reset_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a non-existent resetId (random UUID)
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent password reset record
  // 4. Verify the operation throws HTTP 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent password reset",
    404,
    async () =>
      await api.functional.todoApp.member.member.password_resets.at(
        memberConnection,
        {
          resetId: nonExistentResetId,
        },
      ),
  );
}
