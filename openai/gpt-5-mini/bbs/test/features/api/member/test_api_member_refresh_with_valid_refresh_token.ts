import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1) Create a fresh member via POST /auth/member/join
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // >= 12 chars
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    username,
    email,
    password,
    href,
    referrer,
  } satisfies IDiscussionBoardMember.IJoin;

  const created: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Extract original tokens
  const originalAccess = created.token.access;
  const originalRefresh = created.token.refresh;

  // Small delay to simulate time passage (optional)
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 2) Call refresh endpoint with the refresh token variant
  const refreshBody = {
    type: "refresh_token",
    refresh_token: originalRefresh,
  } satisfies IDiscussionBoardMember.IRefresh.IToken;

  const refreshed: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3) Business validations
  // Member identity preserved
  TestValidator.equals(
    "member id preserved after refresh",
    refreshed.id,
    created.id,
  );

  // Access token rotated (business expectation)
  TestValidator.notEquals(
    "access token should be rotated",
    originalAccess,
    refreshed.token.access,
  );

  // Token object exists and contains expected fields (typia.assert already validates token shape)
  TestValidator.predicate(
    "token strings are present",
    typeof refreshed.token.access === "string" &&
      typeof refreshed.token.refresh === "string",
  );

  // Refreshable metadata is present
  TestValidator.predicate(
    "refreshable_until present",
    refreshed.token.refreshable_until !== undefined &&
      refreshed.token.refreshable_until !== null,
  );

  // Sensitive data should not be exposed (password_hash must not be present)
  TestValidator.predicate(
    "password_hash is not exposed",
    !("password_hash" in refreshed),
  );
}
