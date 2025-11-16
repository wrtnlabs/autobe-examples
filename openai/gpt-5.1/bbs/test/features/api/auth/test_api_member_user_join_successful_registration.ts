import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * E2E: successful discussion board member user registration via join endpoint.
 *
 * This test exercises the happy path for POST /auth/memberUser/join, ensuring
 * that a new member user can register with valid credentials and that the
 * backend returns a fully populated authorized-session payload.
 *
 * Flow:
 *
 * 1. Construct a realistic IDiscussionBoardMemberUserJoin.IRequest payload using
 *    random but valid values for email, password, displayName, href, and
 *    referrer, plus optional profile fields (bio, location, ip).
 * 2. Call api.functional.auth.memberUser.join with that payload.
 * 3. Use typia.assert to guarantee the response matches
 *    IDiscussionBoardMemberuser.IAuthorized.
 * 4. Validate core identity echo (email, display_name) and account lifecycle
 *    defaults (non-empty account_status, consistent timestamps, closed_by_admin
 *    is false).
 * 5. Validate the embedded IAuthorizationToken fields (access/refresh non-empty,
 *    expired_at and refreshable_until in the future).
 */
export async function test_api_member_user_join_successful_registration(
  connection: api.IConnection,
) {
  // 1. Build registration request body
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name(1); // single word, length ~3-7

  const requestBody = {
    email,
    password,
    displayName,
    bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    location: "Seoul, South Korea",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  // 2. Call the join endpoint
  const output: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: requestBody,
    });

  // 3. Type-level validation of the entire response
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(output);

  // 4. Business-level validations

  // 4-1. Identity echo checks
  TestValidator.equals(
    "joined email should match request email",
    output.email,
    email,
  );
  TestValidator.equals(
    "display_name should match request displayName",
    output.display_name,
    displayName,
  );

  // 4-2. Account lifecycle/business defaults
  // account_status should be a non-empty string
  TestValidator.predicate(
    "account_status should be non-empty string",
    output.account_status.length > 0,
  );

  // closed_by_admin should be false on freshly created accounts
  TestValidator.equals(
    "closed_by_admin should be false on new account",
    output.closed_by_admin,
    false,
  );

  // created_at and updated_at should parse as valid dates and maintain order
  const createdAt = new Date(output.created_at);
  const updatedAt = new Date(output.updated_at);

  TestValidator.predicate(
    "created_at should parse to valid Date",
    !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should parse to valid Date",
    !Number.isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be on or after created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );

  // 4-3. Token validations
  const token: IAuthorizationToken = output.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    token.refresh.length > 0,
  );

  const now = new Date();
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);

  TestValidator.predicate(
    "expired_at should parse to valid Date",
    !Number.isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should parse to valid Date",
    !Number.isNaN(refreshableUntil.getTime()),
  );

  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration should be after access token expiration",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
}
