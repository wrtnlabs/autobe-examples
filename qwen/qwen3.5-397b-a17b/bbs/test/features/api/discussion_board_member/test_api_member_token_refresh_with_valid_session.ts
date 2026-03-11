import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member token refresh with valid session.
 *
 * This test verifies the token refresh workflow:
 * 1. Member registers and obtains initial authentication tokens
 * 2. Member uses the refresh token to obtain new tokens
 * 3. New tokens are valid and member profile is returned correctly
 */
export async function test_api_member_token_refresh_with_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to establish initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Extract the refresh token from initial authentication
  const refreshToken: string = joinResult.token.refresh;
  // 3. Create a new connection for token refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with valid refresh token
  const refreshResult: IDiscussionBoardMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh: refreshToken,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(refreshResult);
  // 5. Verify member profile information matches original registration
  TestValidator.equals("member id matches", refreshResult.id, joinResult.id);
  TestValidator.equals("email matches", refreshResult.email, joinResult.email);
  TestValidator.equals(
    "display_name matches",
    refreshResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals("bio matches", refreshResult.bio, joinResult.bio);
  TestValidator.equals("status is active", refreshResult.status, "active");
  // 6. Verify token rotation occurred (new tokens are different from original)
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
}
