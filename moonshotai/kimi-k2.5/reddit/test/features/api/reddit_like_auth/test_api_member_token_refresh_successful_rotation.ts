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

export async function test_api_member_token_refresh_successful_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member and establish initial session with JWT tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens to verify rotation
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Refresh tokens using the refresh token
  const refreshedAuth = await authorize_member_refresh(memberConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IRedditLikeMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate member identity is preserved
  TestValidator.equals("member id preserved", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "member email preserved",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "member username preserved",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "email verified preserved",
    refreshedAuth.emailVerified,
    initialAuth.emailVerified,
  );
  TestValidator.equals(
    "created at preserved",
    refreshedAuth.createdAt,
    initialAuth.createdAt,
  );
  TestValidator.equals(
    "deleted at preserved",
    refreshedAuth.deletedAt,
    initialAuth.deletedAt,
  );
  // 4. Validate token rotation - new tokens must be different
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 5. Verify old refresh token is now invalid
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token should be invalid", async () => {
    await authorize_member_refresh(secondConnection, {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies IRedditLikeMember.IRefresh,
    });
  });
}
