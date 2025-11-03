import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_join_success(connection: api.IConnection) {
  // 1) Prepare a minimal, valid request body for guest self-join
  const requestBody = {
    displayName: "guest-automated-test",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  // 2) Call the guest join API
  const authorized: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // 3) Runtime type validation for entire response
  typia.assert(authorized);

  // 4) Basic business assertions
  TestValidator.predicate(
    "guest id exists",
    authorized.id !== null && authorized.id !== undefined,
  );
  TestValidator.equals(
    "displayName matches request",
    authorized.displayName,
    requestBody.displayName,
  );

  // 5) If an embedded summary is present, ensure it references the same guest id
  if (authorized.guest) {
    typia.assert(authorized.guest);
    TestValidator.equals(
      "embedded guest id matches top-level id",
      authorized.guest.id,
      authorized.id,
    );
  }

  // 6) Token presence and basic checks
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token present and non-empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present and non-empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 7) Temporal fields: ensure they parse to valid dates and satisfy business ordering
  const createdAtNum = new Date(authorized.createdAt).getTime();
  const updatedAtNum = new Date(authorized.updatedAt).getTime();
  const tokenExpiresNum = new Date(token.expired_at).getTime();
  const refreshableUntilNum = new Date(token.refreshable_until).getTime();

  TestValidator.predicate(
    "createdAt is a valid ISO date",
    Number.isFinite(createdAtNum),
  );
  TestValidator.predicate(
    "updatedAt is a valid ISO date",
    Number.isFinite(updatedAtNum),
  );
  TestValidator.predicate(
    "token.expired_at is a valid ISO date",
    Number.isFinite(tokenExpiresNum),
  );
  TestValidator.predicate(
    "token.refreshable_until is a valid ISO date",
    Number.isFinite(refreshableUntilNum),
  );

  TestValidator.predicate(
    "updatedAt is not before createdAt",
    updatedAtNum >= createdAtNum,
  );
  TestValidator.predicate(
    "token expiry after creation",
    tokenExpiresNum > createdAtNum,
  );
  TestValidator.predicate(
    "refreshable_until not before token expiry",
    refreshableUntilNum >= tokenExpiresNum,
  );
}
