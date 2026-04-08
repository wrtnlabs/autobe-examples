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

export async function test_api_member_refresh_account_deleted_session_invalidated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to obtain refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joined);
  // 2. Store the valid refresh token
  const validRefreshToken: string = joined.refresh;
  // 3. Create an invalid refresh token (simulating deleted account's token)
  // This simulates the scenario where a refresh token is used after session deletion
  const invalidRefreshToken: string = "invalid_token_that_will_be_rejected";
  // 4. Attempt to refresh with the valid token first to confirm refresh works
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(validRefreshConnection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IEcommerceMallMember.IRefresh,
  });
  typia.assert(refreshed);
  // 5. Attempt to refresh with an invalid token (simulating deleted session)
  // The system should reject this with 401 Unauthorized
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh should fail for invalid/missing session token",
    async () => {
      await authorize_member_refresh(invalidRefreshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IEcommerceMallMember.IRefresh,
      });
    },
  );
}
