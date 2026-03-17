import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member and get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialAuth);
  const refresh1 = initialAuth.token.refresh;
  // Step 2: First refresh with refresh1
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshedAuth1 = await authorize_member_refresh(refreshConnection1, {
    body: { refreshToken: refresh1 },
  });
  typia.assert(refreshedAuth1);
  const refresh2 = refreshedAuth1.token.refresh;
  // Step 3: Verify refresh1 (old token) cannot be used anymore
  await TestValidator.error("old refresh token should fail", async () => {
    const memberConnection2: api.IConnection = { host: connection.host };
    await authorize_member_refresh(memberConnection2, {
      body: { refreshToken: refresh1 },
    });
  });
  // Step 4: Verify refresh2 (new token) still works
  const refreshConnection2: api.IConnection = { host: connection.host };
  const refreshedAuth2 = await authorize_member_refresh(refreshConnection2, {
    body: { refreshToken: refresh2 },
  });
  typia.assert(refreshedAuth2);
  // Step 5: Verify old refresh2 is now revoked (similar to step 3)
  await TestValidator.error("revoked refresh token should fail", async () => {
    const memberConnection3: api.IConnection = { host: connection.host };
    await authorize_member_refresh(memberConnection3, {
      body: { refreshToken: refresh2 },
    });
  });
}
