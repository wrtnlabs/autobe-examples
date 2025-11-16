import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserRefresh";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

export async function test_api_member_user_token_refresh_with_malformed_payload(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain baseline tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const authorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<IAuthorizationToken>(authorized.token);
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(authorized);

  const originalToken: IAuthorizationToken = authorized.token;

  // 2. Prepare a malformed (tampered) refresh token payload, but still string type
  const tamperedRefreshToken: string = `${originalToken.refresh}.${RandomGenerator.alphaNumeric(16)}`;

  const malformedRefreshBody = {
    refresh_token: tamperedRefreshToken,
  } satisfies IDiscussionBoardMemberUserRefresh.IRequest;

  // 3. Call refresh with malformed token and expect business-level failure
  await TestValidator.error(
    "refresh with tampered token must fail",
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: malformedRefreshBody,
      });
    },
  );

  // 4. Call refresh again with the original, correct refresh token and expect success
  const validRefreshBody = {
    refresh_token: originalToken.refresh,
  } satisfies IDiscussionBoardMemberUserRefresh.IRequest;

  const refreshed: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: validRefreshBody,
    });

  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(refreshed);
  typia.assert<IAuthorizationToken>(refreshed.token);

  // 5. Validate that core identity fields are unchanged
  TestValidator.equals(
    "member id must be stable across refresh",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email must be stable across refresh",
    refreshed.email,
    authorized.email,
  );

  // 6. Ensure refreshed tokens are structurally valid and non-empty strings
  TestValidator.predicate(
    "refreshed access token must be non-empty string",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token must be non-empty string",
    refreshed.token.refresh.length > 0,
  );

  // 7. Ensure lifecycle/account status flags remain unchanged despite failed refresh
  TestValidator.equals(
    "account_status must remain unchanged",
    refreshed.account_status,
    authorized.account_status,
  );
  TestValidator.equals(
    "closed_by_admin flag must remain unchanged",
    refreshed.closed_by_admin,
    authorized.closed_by_admin,
  );
}
