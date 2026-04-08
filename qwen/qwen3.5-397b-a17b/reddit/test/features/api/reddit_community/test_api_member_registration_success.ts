import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration with complete authentication flow.
 *
 * Validates the complete member registration process including account creation with unique credentials, bcrypt password hashing, email verification token generation, and JWT session establishment. Ensures the system returns a properly structured IRedditCommunityMember.IAuthorized response with all required profile fields and authentication tokens.
 *
 * The test verifies that new member accounts are created with default profile values (display_name from username, null bio and avatar, zero karma) and that the authentication token pair (access_token and refresh_token) is properly generated with correct expiration timestamps. The member connection is automatically configured with the access token for subsequent authenticated operations.
 *
 * 1. Generate unique registration credentials with random email, password, username, and session context fields.
 * 2. Call authorize_member_join utility function to register new member and establish authentication session.
 * 3. Validate response structure using typia.assert() for complete type validation.
 * 4. Verify all required profile fields exist with correct types and default values for new members.
 * 5. Validate token object contains access, refresh, expired_at, and refreshable_until fields.
 * 6. Confirm karma is 0 for new member and display_name matches username.
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputUsername = RandomGenerator.name(1);
  const authorized: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: inputEmail,
        password: RandomGenerator.alphaNumeric(16),
        username: inputUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Validate complete response structure
  typia.assert(authorized);
  // 3. Verify profile fields match input
  TestValidator.equals("email matches input", authorized.email, inputEmail);
  TestValidator.equals(
    "username matches input",
    authorized.username,
    inputUsername,
  );
  TestValidator.predicate(
    "display_name is non-empty",
    authorized.display_name.length > 0,
  );
  // 4. Verify default values for new member
  TestValidator.equals("bio is null for new member", authorized.bio, null);
  TestValidator.equals(
    "avatar is null for new member",
    authorized.avatar,
    null,
  );
  TestValidator.equals("karma is zero for new member", authorized.karma, 0);
  // 5. Validate token structure
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // 6. Verify token expiration logic (refreshable_until >= expired_at)
  TestValidator.predicate(
    "refreshable_until is after or equal to expired_at",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}
