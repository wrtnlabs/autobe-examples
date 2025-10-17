import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitor";
import type { IEconDiscussVisitorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorJoin";
import type { IEconDiscussVisitorRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorRefresh";

export async function test_api_visitor_refresh_with_invalid_token_unauthorized(
  connection: api.IConnection,
) {
  // Scenario: invalid refresh token must be rejected; valid token must succeed.
  // Steps:
  // 1) Join a Visitor to obtain initial authorized tokens
  // 2) Attempt refresh with a synthetically invalid token and expect failure
  // 3) Refresh with the original valid token and expect success
  // 4) Validate business invariants (same user id; token rotation optional)

  // 1) Join a Visitor
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVisitorJoin.ICreate;

  const authorized: IEconDiscussVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Prepare a synthetically invalid refresh token
  const invalidRefreshToken: string = `${authorized.token.refresh}.${RandomGenerator.alphaNumeric(16)}.invalid`;

  // Attempt refresh with invalid token -> must error (no status code assertion)
  await TestValidator.error(
    "refresh must reject invalid refresh_token",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IEconDiscussVisitorRefresh.IRequest,
      });
    },
  );

  // 3) Valid refresh with the original token -> must succeed
  const refreshed: IEconDiscussVisitor.IAuthorized =
    await api.functional.auth.visitor.refresh(connection, {
      body: {
        refresh_token: authorized.token.refresh,
      } satisfies IEconDiscussVisitorRefresh.IRequest,
    });
  typia.assert(refreshed);

  // 4) Business validations
  TestValidator.equals(
    "refreshed session belongs to the same user",
    refreshed.id,
    authorized.id,
  );

  // Optional: token rotation check (policy-dependent). Accept both behaviors.
  if (refreshed.token.access !== authorized.token.access) {
    TestValidator.notEquals(
      "access token rotated on refresh",
      refreshed.token.access,
      authorized.token.access,
    );
  } else {
    TestValidator.equals(
      "access token may remain unchanged by policy",
      refreshed.token.access,
      authorized.token.access,
    );
  }
}
