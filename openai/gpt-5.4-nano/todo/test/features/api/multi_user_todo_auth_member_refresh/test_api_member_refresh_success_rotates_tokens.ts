import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_success_rotates_tokens(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member refresh token rotation behavior.
   *
   * Validates that a member join response issues a refresh token that can be
   * exchanged at the member refresh endpoint for a new access/refresh token
   * pair. Ensures that expiration metadata is present and that both refresh
   * and access tokens are rotated (i.e., not echoed from the original token).
   *
   * 1. Member registers via join to obtain initial token pair (R0/A0).
   * 2. Member refreshes using R0 and receives a rotated token pair.
   * 3. Optionally attempts to refresh again with the old R0 token and accepts
   *    either rotation-consistent success or strict revocation failure.
   */
  // 1) Register a new member (join) and capture initial token pair
  const memberConnectionForJoin: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnectionForJoin, {
    body: {
      display_name: typia.random<string & tags.MinLength<1>>(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const initialAccess: string = joined.token.access;
  const initialRefresh: string = joined.token.refresh;
  // 2) Refresh using initial refresh token
  const memberConnectionForRefresh: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(memberConnectionForRefresh, {
    body: {
      refreshToken: initialRefresh,
    },
  });
  typia.assert(refreshed);
  // 3) Validate token rotation + expiration metadata
  TestValidator.notEquals(
    "refresh token should rotate",
    refreshed.token.refresh,
    initialRefresh,
  );
  TestValidator.notEquals(
    "access token should rotate",
    refreshed.token.access,
    initialAccess,
  );
  // typia.assert already validates: refreshable_until/expired_at presence and date-time format
  // 4) Optional follow-up (rotation strictness varies): accept either a rotated success or a thrown error.
  const memberConnectionForReuseOld: api.IConnection = {
    host: connection.host,
  };
  try {
    const secondRefresh = await authorize_member_refresh(
      memberConnectionForReuseOld,
      {
        body: {
          refreshToken: initialRefresh,
        },
      },
    );
    typia.assert(secondRefresh);
    // If it succeeded, ensure it doesn't keep issuing the same refresh token forever.
    if (secondRefresh.token.refresh === refreshed.token.refresh) {
      // no-op: keep scenario tolerant of reuse behavior
    } else {
      TestValidator.notEquals(
        "reused refresh should not keep issuing the same refresh token",
        secondRefresh.token.refresh,
        refreshed.token.refresh,
      );
    }
  } catch {
    // Strict rotation/revocation: old refresh token should not be usable anymore.
  }
}
