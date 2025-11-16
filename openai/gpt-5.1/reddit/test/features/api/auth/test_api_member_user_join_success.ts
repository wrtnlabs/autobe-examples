import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful member user self-registration via /auth/memberUser/join.
 *
 * Business goal
 *
 * - Ensure a brand-new member user can join with username/email/password +
 *   href/referrer and immediately receive an authorization envelope with usable
 *   JWT tokens.
 * - Confirm that core identity fields in the response match the request and that
 *   token structure is present and valid.
 * - Verify that no sensitive credential data like the raw password is leaked back
 *   in the response body.
 *
 * High-level flow
 *
 * 1. Build a realistic join request of type
 *    ICommunityPlatformMemberuser.IJoinRequest.
 *
 *    - Username: random human-like name based on RandomGenerator.name
 *    - Email: typia.random<string & tags.Format<"email">>() to ensure format
 *         correctness
 *    - Password: strong-looking random string (e.g., RandomGenerator.alphaNumeric)
 *    - Ip: omit (optional), do not rely on server behavior
 *    - Href/referrer: typia.random<string & tags.Format<"uri">>()
 * 2. Call api.functional.auth.memberUser.join(connection, { body }) and await the
 *    result.
 * 3. Use typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized) to
 *    enforce full DTO conformance at runtime.
 * 4. Validate key identity echo behavior with TestValidator.equals:
 *
 *    - Authorized.username equals request.username
 *    - Authorized.email equals request.email
 * 5. Validate structural/token business rules:
 *
 *    - Id is non-empty (typia.assert already checks UUID; here we only ensure not
 *         empty string)
 *    - StatusCode is non-empty string
 *    - CreatedAt is present (non-empty); no extra parsing/format checks beyond
 *         typia.assert
 *    - Token field satisfies basic expectations:
 *
 *         - Access and refresh are non-empty strings
 *         - Expired_at and refreshable_until are non-empty strings
 *    - If accessToken/refreshToken top-level properties are defined, they are also
 *         non-empty strings
 * 6. Verify secrecy of credentials:
 *
 *    - Confirm that authorized does not expose the plain password anywhere in
 *         obvious text fields: username, displayName, bio, email, statusCode,
 *         accountStatusKey, accessToken, refreshToken, or token.access/refresh.
 *         This is done by substring checks using TestValidator.predicate.
 * 7. Do not decode JWTs or touch connection.headers—trust typia.assert and string
 *    presence checks only. This test is purely about response structure and
 *    basic business semantics of a successful join.
 */
export async function test_api_member_user_join_success(
  connection: api.IConnection,
) {
  // 1. Build a realistic join request payload
  const username: string = RandomGenerator.name(1);
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const body = {
    username,
    email,
    password,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  // 2. Call join endpoint
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body,
    });

  // 3. Full DTO shape validation
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 4. Identity echo checks
  TestValidator.equals(
    "joined username should echo request username",
    authorized.username,
    body.username,
  );
  TestValidator.equals(
    "joined email should echo request email",
    authorized.email,
    body.email,
  );

  // 5. Basic structural/token checks
  TestValidator.predicate(
    "member id must be non-empty string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "statusCode must be non-empty string",
    typeof authorized.statusCode === "string" &&
      authorized.statusCode.length > 0,
  );
  TestValidator.predicate(
    "createdAt must be non-empty string",
    typeof authorized.createdAt === "string" && authorized.createdAt.length > 0,
  );

  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "token.access must be non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh must be non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at must be non-empty string",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until must be non-empty string",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  if (authorized.accessToken !== undefined) {
    TestValidator.predicate(
      "optional accessToken must be non-empty when present",
      authorized.accessToken.length > 0,
    );
  }
  if (authorized.refreshToken !== undefined) {
    TestValidator.predicate(
      "optional refreshToken must be non-empty when present",
      authorized.refreshToken.length > 0,
    );
  }

  // 6. Ensure password is not leaked back in response fields
  const sensitiveFields: (string | undefined)[] = [
    authorized.username,
    authorized.displayName,
    authorized.bio,
    authorized.email,
    authorized.statusCode,
    authorized.accountStatusKey,
    authorized.accessToken,
    authorized.refreshToken,
    token.access,
    token.refresh,
  ];

  for (const field of sensitiveFields) {
    if (field !== undefined) {
      TestValidator.predicate(
        "response text fields must not contain raw password",
        !field.includes(password),
      );
    }
  }
}
