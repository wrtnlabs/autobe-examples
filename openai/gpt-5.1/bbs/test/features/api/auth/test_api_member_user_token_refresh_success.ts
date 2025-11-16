import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserRefresh";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

export async function test_api_member_user_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join endpoint to obtain initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(1),
    bio: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const original: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(original);

  // 2. Prepare refresh request using the original refresh token
  const refreshBody = {
    refresh_token: original.token.refresh,
  } satisfies IDiscussionBoardMemberUserRefresh.IRequest;

  const refreshed: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(refreshed);

  // 3. Identity invariants: id, email, display_name, created_at should stay the same
  TestValidator.equals(
    "member id is preserved across refresh",
    refreshed.id,
    original.id,
  );
  TestValidator.equals(
    "member email is preserved across refresh",
    refreshed.email,
    original.email,
  );
  TestValidator.equals(
    "display_name is preserved across refresh",
    refreshed.display_name,
    original.display_name,
  );
  TestValidator.equals(
    "created_at is preserved across refresh",
    refreshed.created_at,
    original.created_at,
  );

  // 4. Lifecycle sanity checks
  TestValidator.equals(
    "account_status remains unchanged after refresh",
    refreshed.account_status,
    original.account_status,
  );
  TestValidator.equals(
    "email_verified remains unchanged after refresh",
    refreshed.email_verified,
    original.email_verified,
  );
  TestValidator.equals(
    "closed_by_admin remains unchanged after refresh",
    refreshed.closed_by_admin,
    original.closed_by_admin,
  );

  TestValidator.equals(
    "deleted_at remains unchanged after immediate refresh",
    refreshed.deleted_at ?? null,
    original.deleted_at ?? null,
  );
  TestValidator.equals(
    "closed_at remains unchanged after immediate refresh",
    refreshed.closed_at ?? null,
    original.closed_at ?? null,
  );

  // 5. Token rotation: access and refresh tokens must change
  TestValidator.notEquals(
    "access token must be rotated on refresh",
    refreshed.token.access,
    original.token.access,
  );
  TestValidator.notEquals(
    "refresh token must be rotated on refresh",
    refreshed.token.refresh,
    original.token.refresh,
  );

  // 6. Token temporal consistency checks on refreshed token
  const now = new Date();
  const refreshedExpiredAt = new Date(refreshed.token.expired_at);
  const refreshedRefreshableUntil = new Date(refreshed.token.refreshable_until);

  TestValidator.predicate(
    "refreshed access token expiry should be in the future",
    refreshedExpiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshed refresh token lifetime should extend at least through access token expiry",
    refreshedRefreshableUntil.getTime() >= refreshedExpiredAt.getTime(),
  );
}
