import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Tests member authentication failure with incorrect password using valid credentials.
 *
 * Validates the security behavior of the login endpoint when a registered member
 * provides their valid registered email address but an incorrect password. The system
 * queries reddit_like_community_members for an active account where deleted_at IS NULL
 * matching the email, but the cryptographic password_hash verification fails because the
 * submitted password does not match the stored hash. Returns a generic 'invalid
 * credentials' error that doesn't distinguish between non-existent email and incorrect
 * password, preventing credential enumeration attacks.
 *
 * The member's account remains in its existing state with no timestamp updates or
 * session tracking occurring since authentication failed. This validates the authentication
 * failure business rule for incorrect password scenarios per Section 123.
 *
 * 1. Creates a new member account with known email credentials via
 *    authorize_member_join utility to establish valid test credentials.
 * 2. Attempts login with the valid registered email but deliberately wrong password,
 *    expecting the system to reject with generic error response.
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
) {
  // Admin setup - Create member account for testing wrong password authentication
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    });
  typia.assert(member);
  // Test login with valid email but incorrect password - should be rejected
  await TestValidator.error("wrong password login rejected", async () => {
    await api.functional.redditLikeCommunity.auth.member.login(joinConnection, {
      body: {
        email: member.email,
        password: "wrong_password",
      } satisfies IREdditLikeCommunityMember.ILogin,
    });
  });
}
