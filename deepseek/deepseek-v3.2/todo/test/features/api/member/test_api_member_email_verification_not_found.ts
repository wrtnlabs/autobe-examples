import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test attempting to retrieve a non-existent email verification token.
 *
 * This scenario validates proper error handling when a member attempts to access
 * a verification token that doesn't exist. First, authenticate as a member via
 * join endpoint. Then, attempt to retrieve a verification token with a randomly
 * generated UUID that doesn't exist in the system. The endpoint should return
 * a 404 Not Found error.
 *
 * This tests the system's ability to validate UUID format and existence before
 * attempting database lookup, and ensures proper error responses for security
 * audit workflows.
 */
export async function test_api_member_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Generate a random UUID that doesn't exist
  const nonExistentVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent verification token
  await TestValidator.error(
    "should return 404 for non-existent verification",
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        memberConnection,
        {
          verificationId: nonExistentVerificationId,
        },
      );
    },
  );
}
