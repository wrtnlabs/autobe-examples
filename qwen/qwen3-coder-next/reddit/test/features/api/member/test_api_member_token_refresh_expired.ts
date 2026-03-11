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

export async function test_api_member_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(joined);
  // Step 2: Extract the refresh token from the joined result
  const refreshToken = joined.token.refresh;
  typia.assert(refreshToken);
  // Step 3: Simulate token expiration by using an expired/invalid refresh token
  await TestValidator.error("should reject expired refresh token", async () => {
    await authorize_member_refresh(memberConnection, {
      body: {
        refresh_token: refreshToken + "_invalid_suffix",
      } satisfies IRedditLikeMember.IRefresh,
    });
  });
  // Step 4: Verify the original token is also rejected (session invalidated or rotated)
  await TestValidator.error(
    "should reject original token after failure",
    async () => {
      await authorize_member_refresh(memberConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );
}
