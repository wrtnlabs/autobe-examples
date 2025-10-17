import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_registration_with_remember_me_extended_token(
  connection: api.IConnection,
) {
  // Generate unique registration credentials
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  // Register new member account with Remember Me functionality
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate registration response structure (complete validation)
  typia.assert(registeredMember);

  // Parse token expiration timestamps
  const expiredAt = new Date(registeredMember.token.expired_at);
  const refreshableUntil = new Date(registeredMember.token.refreshable_until);
  const now = new Date();

  // Validate access token expiration (standard 30 minutes)
  const accessTokenExpirationMinutes = Math.round(
    (expiredAt.getTime() - now.getTime()) / (1000 * 60),
  );
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTokenExpirationMinutes >= 28 && accessTokenExpirationMinutes <= 32,
  );

  // Validate refresh token expiration (extended 30 days for Remember Me)
  const refreshTokenExpirationDays = Math.round(
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  TestValidator.predicate(
    "refresh token expires in approximately 30 days due to Remember Me",
    refreshTokenExpirationDays >= 28 && refreshTokenExpirationDays <= 31,
  );

  // Ensure refresh token expiration is significantly longer than access token
  TestValidator.predicate(
    "refresh token expiration should be much longer than access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
