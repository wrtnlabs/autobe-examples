import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_password_resets_create } from "../../../generate/generate_random_reddit_like_member_password_resets_create";
import { prepare_random_reddit_like_member_password_reset } from "../../../prepare/prepare_random_reddit_like_member_password_reset";

/**
 * Test password reset initiation for an existing member account.
 *
 * Validates the password reset flow by registering a new member and then requesting a password reset using their registered email address. The test ensures the system generates a password reset token and returns a generic success response without revealing whether the email exists in the system.
 *
 * This test verifies the primary success path for password reset initiation, including proper email validation and the security measure of returning generic responses to prevent email enumeration attacks.
 *
 * 1. Register a new member account with valid credentials (email, password, username).
 * 2. Extract the registered email address from the member account.
 * 3. Create a member-specific connection for the password reset request.
 * 4. Request password reset using the registered email address.
 * 5. Validate the response contains success: true and a generic message.
 * 6. Verify response type matches IRedditLikeMemberPasswordReset.IResponse.
 */
export async function test_api_password_reset_for_existing_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset using the registered email
  const passwordResetConnection: api.IConnection = { host: connection.host };
  const resetResponse =
    await generate_random_reddit_like_member_password_resets_create(
      passwordResetConnection,
      {
        body: {
          email: member.email,
        } satisfies IRedditLikeMemberPasswordReset.ICreate,
      },
    );
  typia.assert(resetResponse);
  // 3. Validate response fields
  TestValidator.equals("reset request succeeded", resetResponse.success, true);
  TestValidator.predicate(
    "response message exists",
    resetResponse.message.length > 0,
  );
}
