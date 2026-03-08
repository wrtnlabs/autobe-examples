import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to establish initial session
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const joinedMember = await api.functional.redditLike.auth.member.join(
    connection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinedMember);
  // 2. Extract refresh token from initial registration
  const initialRefreshToken = joinedMember.token.refresh;
  // 3. Call refresh endpoint with valid refresh token
  const refreshInput = {
    refresh_token: initialRefreshToken,
  } satisfies IRedditLikeMember.IRefresh;
  const refreshedMember = await api.functional.redditLike.auth.member.refresh(
    connection,
    {
      body: refreshInput,
    },
  );
  typia.assert(refreshedMember);
  // 4. Validate refresh response structure
  TestValidator.equals(
    "member ID matches after refresh",
    joinedMember.id,
    refreshedMember.id,
  );
  TestValidator.equals(
    "email matches after refresh",
    joinedMember.email,
    refreshedMember.email,
  );
  TestValidator.equals(
    "username matches after refresh",
    joinedMember.username,
    refreshedMember.username,
  );
  // 5. Validate new token structure
  TestValidator.equals(
    "new access token exists",
    typeof refreshedMember.token.access,
    "string",
  );
  TestValidator.equals(
    "new refresh token exists",
    typeof refreshedMember.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "new access token is different from old",
    refreshedMember.token.access !== joinedMember.token.access,
  );
  TestValidator.predicate(
    "new refresh token is different from old (token rotation)",
    refreshedMember.token.refresh !== joinedMember.token.refresh,
  );
  // 6. Validate expiration timestamps
  const now = new Date().toISOString();
  TestValidator.predicate(
    "new access token not expired",
    refreshedMember.token.expired_at > now,
  );
  TestValidator.predicate(
    "new refresh token not expired",
    refreshedMember.token.refreshable_until > refreshedMember.token.expired_at,
  );
  // 7. Verify member stats are populated
  TestValidator.predicate(
    "total_posts is non-negative",
    refreshedMember.total_posts >= 0,
  );
  TestValidator.predicate(
    "karma_score is non-negative",
    refreshedMember.karma_score >= 0,
  );
}
