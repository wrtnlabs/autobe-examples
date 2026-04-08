import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorPasswordReset";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorPasswordReset";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test filtering password reset tokens by expiration status (active vs expired).
 *
 * Validates the password reset token filtering functionality for moderator accounts. Tests that tokens can be correctly filtered by their expiration status, ensuring that active tokens (not yet expired) and expired tokens are properly distinguished based on their expires_at timestamp compared to the current time.
 *
 * Special attention is given to verifying that the status filter correctly computes token expiration by comparing expires_at with the current timestamp, and that pagination works correctly with the status filter applied.
 *
 * 1. Authenticate as a moderator using /auth/moderator/join
 * 2. Call the password reset list endpoint with status='active' filter
 * 3. Verify all returned active tokens have expires_at in the future
 * 4. Call the password reset list endpoint with status='expired' filter
 * 5. Verify all returned expired tokens have expires_at in the past
 * 6. Test pagination with status filter to ensure consistent results
 */
export async function test_api_moderator_password_reset_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Test filtering by status='active'
  const activeTokens =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderatorConnection,
      {
        body: {
          status: "active",
          limit: 20,
        } satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(activeTokens);
  // 3. Verify all active tokens have expires_at in the future
  const now = new Date();
  for (const token of activeTokens.data) {
    const expiresAt = new Date(token.expires_at);
    TestValidator.predicate(
      `active token ${token.id} expires in future`,
      expiresAt > now,
    );
  }
  // 4. Test filtering by status='expired'
  const expiredTokens =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderatorConnection,
      {
        body: {
          status: "expired",
          limit: 20,
        } satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(expiredTokens);
  // 5. Verify all expired tokens have expires_at in the past
  for (const token of expiredTokens.data) {
    const expiresAt = new Date(token.expires_at);
    TestValidator.predicate(
      `expired token ${token.id} expires in past`,
      expiresAt <= now,
    );
  }
  // 6. Test pagination with status='active' filter
  const paginatedActive =
    await api.functional.redditClone.moderator.moderator.password_resets.index(
      moderatorConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModeratorPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedActive);
  // 7. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination page number",
    paginatedActive.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedActive.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count valid",
    paginatedActive.pagination.records >= 0,
  );
  // 8. Verify all tokens in paginated result are still active
  for (const token of paginatedActive.data) {
    const expiresAt = new Date(token.expires_at);
    TestValidator.predicate(
      `paginated active token ${token.id} expires in future`,
      expiresAt > now,
    );
  }
}
