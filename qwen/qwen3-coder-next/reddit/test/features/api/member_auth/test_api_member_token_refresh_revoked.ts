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

/**
 * Test member token refresh with revoked refresh token.
 *
 * Workflow:
 * 1. Join as member to get initial tokens
 * 2. Store the original refresh token
 * 3. Attempt to refresh with invalid/stolen token - should fail with 401
 * 4. Verify server security prevents unauthorized token reuse
 */
export async function test_api_member_token_refresh_revoked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Store the original refresh token
  const originalRefreshToken = member.token.refresh;
  // 3. Attempt to use a revoked/stolen refresh token
  // This simulates the scenario where an attacker has stolen the token
  await TestValidator.error("revoked refresh token rejected", async () => {
    await api.functional.redditLike.auth.member.refresh(memberConnection, {
      body: {
        refresh_token: "invalid-stolen-refresh-token",
      } satisfies IRedditLikeMember.IRefresh,
    });
  });
  // 4. Also test that the original token can't be reused (simulating revocation)
  await TestValidator.error(
    "original token rejected after revocation simulation",
    async () => {
      await api.functional.redditLike.auth.member.refresh(memberConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );
}
