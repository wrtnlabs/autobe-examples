import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialAuth);
  // Extract the initial refresh token from the registration response
  const initialRefreshToken: string = initialAuth.refresh;
  // Step 2: Call the refresh endpoint to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResponse = await authorize_member_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
      },
    },
  );
  typia.assert(firstRefreshResponse);
  // Extract the new refresh token from the first refresh response
  const newRefreshToken: string = firstRefreshResponse.refresh;
  // Step 3: Validate that the new refresh token is different from the initial one
  TestValidator.notEquals(
    "new refresh token differs from initial",
    initialRefreshToken,
    newRefreshToken,
  );
  // Step 4: Attempt to use the original (old) refresh token
  // This should be rejected because it was invalidated during the first refresh
  const replayConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be rejected after first use",
    async () => {
      await authorize_member_refresh(replayConnection, {
        body: {
          refresh_token: initialRefreshToken,
        },
      });
    },
  );
}
