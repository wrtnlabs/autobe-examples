import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refresh token rotation security by attempting to reuse an already-used refresh token.
 *
 * Validates that the refresh token rotation mechanism properly invalidates old refresh tokens after use, preventing token replay attacks. When a refresh token is used to obtain new tokens, the old token should be immediately invalidated, and any subsequent attempt to reuse it should fail with a 401 Unauthorized error.
 *
 * This security measure limits the attack window if a refresh token is compromised, as the attacker can only use it once before it becomes invalid.
 *
 * 1. Create member account with random credentials to obtain initial refresh token.
 * 2. Extract the refresh token from the authorization response.
 * 3. Successfully refresh tokens once using the original refresh token.
 * 4. Attempt to reuse the same original refresh token a second time.
 * 5. Validate that the second refresh attempt fails with 401 Unauthorized error.
 */
export async function test_api_member_refresh_token_reused(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to obtain initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Extract the original refresh token
  const originalRefreshToken: string = joinOutput.token.refresh;
  // 3. Successfully refresh tokens once
  const refreshConnection: api.IConnection = { host: connection.host };
  refreshConnection.headers = { ...memberConnection.headers };
  const firstRefreshOutput = await authorize_member_refresh(refreshConnection, {
    body: { refresh_token: originalRefreshToken } satisfies IHrmMember.IRefresh,
  });
  typia.assert(firstRefreshOutput);
  // 4. Attempt to reuse the same original refresh token - should fail
  const reuseConnection: api.IConnection = { host: connection.host };
  reuseConnection.headers = { ...memberConnection.headers };
  // 5. Validate that reusing the old token throws 401 error
  await TestValidator.httpError(
    "reused refresh token should be rejected with 401",
    401,
    async () => {
      await authorize_member_refresh(reuseConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IHrmMember.IRefresh,
      });
    },
  );
}
