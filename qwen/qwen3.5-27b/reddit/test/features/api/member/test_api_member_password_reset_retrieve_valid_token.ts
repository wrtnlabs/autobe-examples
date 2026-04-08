import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberPasswordReset";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve their own valid password reset record.
 *
 * Validates the password reset retrieval flow for authenticated members. The test ensures that members can access their password reset token metadata while maintaining security by not exposing the actual token value. Verifies that unused tokens show used_at as null and that the token expiration time is in the future.
 *
 * Special attention is given to connection isolation (creating member-specific connection after authentication) and response validation (ensuring password reset metadata is complete and member information is correctly associated).
 *
 * 1. Register a new member account with email, password, and username.
 * 2. Create member-specific connection with authentication token.
 * 3. Generate a valid UUID for the password reset record ID.
 * 4. Retrieve the password reset record using the resetId.
 * 5. Validate response structure and business logic constraints.
 */
export async function test_api_member_password_reset_retrieve_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a valid resetId (simulating a previously created password reset)
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the password reset record
  const passwordReset =
    await api.functional.redditClone.member.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 4. Validate business logic
  TestValidator.equals("resetId matches", passwordReset.id, resetId);
  TestValidator.equals("member id matches", passwordReset.member.id, member.id);
  TestValidator.equals("token is unused", passwordReset.used_at, null);
  TestValidator.predicate(
    "token not expired",
    new Date(passwordReset.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "created_at is before expired_at",
    new Date(passwordReset.created_at) < new Date(passwordReset.expired_at),
  );
}
