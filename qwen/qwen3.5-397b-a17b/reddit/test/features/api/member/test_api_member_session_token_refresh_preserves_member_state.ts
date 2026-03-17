import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that token refresh preserves all member state and profile information
 * while updating authentication tokens.
 *
 * **Test Flow:**
 * 1. Create a new member account using authorize_member_join utility function
 * 2. Capture baseline member state from join response
 * 3. Call authorize_member_refresh utility with the refresh_token from join
 * 4. Verify all member identity fields remain unchanged after refresh
 * 5. Verify tokens are updated with fresh access and refresh tokens
 * 6. Verify updated_at timestamp is valid
 */
export async function test_api_member_session_token_refresh_preserves_member_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and capture baseline state
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Capture baseline member state for comparison
  const baselineState = {
    id: joinResponse.id,
    username: joinResponse.username,
    display_name: joinResponse.display_name,
    bio: joinResponse.bio,
    avatar: joinResponse.avatar,
    created_at: joinResponse.created_at,
    updated_at: joinResponse.updated_at,
    email: joinResponse.email,
    karma_score: joinResponse.karma_score,
    deleted_at: joinResponse.deleted_at,
  };
  // 3. Refresh token using the refresh_token from join response
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: joinResponse.token.refresh,
    } satisfies IRedditCloneMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Verify member identity fields remain unchanged
  TestValidator.equals(
    "member id preserved",
    refreshResponse.id,
    baselineState.id,
  );
  TestValidator.equals(
    "username preserved",
    refreshResponse.username,
    baselineState.username,
  );
  TestValidator.equals(
    "display_name preserved",
    refreshResponse.display_name,
    baselineState.display_name,
  );
  TestValidator.equals("bio preserved", refreshResponse.bio, baselineState.bio);
  TestValidator.equals(
    "avatar preserved",
    refreshResponse.avatar,
    baselineState.avatar,
  );
  TestValidator.equals(
    "email preserved",
    refreshResponse.email,
    baselineState.email,
  );
  TestValidator.equals(
    "created_at preserved",
    refreshResponse.created_at,
    baselineState.created_at,
  );
  TestValidator.equals(
    "deleted_at preserved",
    refreshResponse.deleted_at,
    baselineState.deleted_at,
  );
  // 5. Verify karma_score structure is preserved
  TestValidator.equals(
    "karma_score id preserved",
    refreshResponse.karma_score.id,
    baselineState.karma_score.id,
  );
  TestValidator.equals(
    "karma_score score preserved",
    refreshResponse.karma_score.score,
    baselineState.karma_score.score,
  );
  TestValidator.equals(
    "karma_score member id preserved",
    refreshResponse.karma_score.member.id,
    baselineState.karma_score.member.id,
  );
  TestValidator.equals(
    "karma_score member username preserved",
    refreshResponse.karma_score.member.username,
    baselineState.karma_score.member.username,
  );
  // 6. Verify tokens are updated (new access and refresh tokens)
  TestValidator.notEquals(
    "access token updated",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token updated",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  TestValidator.notEquals(
    "token expired_at updated",
    refreshResponse.token.expired_at,
    joinResponse.token.expired_at,
  );
  TestValidator.notEquals(
    "token refreshable_until updated",
    refreshResponse.token.refreshable_until,
    joinResponse.token.refreshable_until,
  );
  // 7. Verify updated_at timestamp is valid (should be >= created_at)
  const createdAtTime = new Date(baselineState.created_at).getTime();
  const updatedAtTime = new Date(refreshResponse.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedAtTime >= createdAtTime,
  );
}
