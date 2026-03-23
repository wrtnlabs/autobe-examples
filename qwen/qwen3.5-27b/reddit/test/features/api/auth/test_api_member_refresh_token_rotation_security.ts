import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test refresh token rotation security.
 * Validates that refresh tokens are single-use and become invalid after first use,
 * preventing replay attacks through token rotation mechanism.
 */
export async function test_api_member_refresh_token_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Extract the initial refresh token
  const originalRefreshToken = joinResult.token.refresh;
  // 3. First refresh operation with the original token
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IRedditCloneMember.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // Verify first refresh succeeded
  TestValidator.predicate(
    "first refresh succeeds",
    firstRefreshResult !== null,
  );
  TestValidator.equals(
    "new refresh token different from original",
    firstRefreshResult.token.refresh,
    originalRefreshToken,
  );
  // 4. Attempt second refresh with the ORIGINAL token (should fail)
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "original token invalid after rotation",
    async () => {
      await authorize_member_refresh(secondRefreshConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IRedditCloneMember.IRefresh,
      });
    },
  );
}
