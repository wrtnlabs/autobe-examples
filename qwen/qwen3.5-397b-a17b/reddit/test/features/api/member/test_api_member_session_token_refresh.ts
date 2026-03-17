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
 * Test member session token refresh workflow to verify continuous authentication without re-login.
 *
 * **Test Flow:**
 * 1. Create a new member account via authorize_member_join with valid credentials
 * 2. Capture the refresh_token from the join response
 * 3. Call POST /redditClone/auth/member/refresh with the captured refresh_token
 * 4. Verify the response contains same member identity with new tokens
 * 5. Validate karma_score and token expiration timestamps are properly set
 */
export async function test_api_member_session_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {
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
  typia.assert(joinResult);
  // 2. Capture the refresh token from join response
  const refreshToken: string = joinResult.token.refresh;
  // 3. Call refresh endpoint with the captured refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult: IRedditCloneMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IRedditCloneMember.IRefresh,
    });
  typia.assert(refreshResult);
  // 4. Validate member identity is preserved after refresh
  TestValidator.equals("member id preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "username preserved",
    refreshResult.username,
    joinResult.username,
  );
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "display_name preserved",
    refreshResult.display_name,
    joinResult.display_name,
  );
  // 5. Validate new tokens are generated
  TestValidator.notEquals(
    "new access token generated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token generated",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 6. Validate tokens are non-empty (business validation)
  TestValidator.predicate(
    "access token is non-empty string",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    refreshResult.token.refresh.length > 0,
  );
  // 7. Validate karma_score member relationship
  TestValidator.equals(
    "karma_score member id matches",
    refreshResult.karma_score.member.id,
    joinResult.id,
  );
  TestValidator.equals(
    "karma_score member username matches",
    refreshResult.karma_score.member.username,
    joinResult.username,
  );
  // 8. Validate account state (deleted_at should be null for active account)
  TestValidator.predicate(
    "deleted_at is null for active account",
    refreshResult.deleted_at === null,
  );
}
