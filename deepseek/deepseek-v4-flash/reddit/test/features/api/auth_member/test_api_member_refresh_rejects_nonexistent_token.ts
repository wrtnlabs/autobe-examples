import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
 * Test that a non-existent or malformed refresh token is properly rejected.
 *
 * Verifies that the system rejects refresh attempts with tokens that were never issued. The first validation check in the refresh specification is "Verify: record exists" — this test confirms that a random, never-issued token string triggers a 404 Not Found response without leaking information about existing sessions or member accounts.
 *
 * 1. Register a new member account (dependency per scenario plan).
 * 2. Generate a random UUID as a fake, never-issued refresh token string.
 * 3. Call the refresh endpoint with the fake token.
 * 4. Verify the call is rejected with HTTP 404.
 */
export async function test_api_member_refresh_rejects_nonexistent_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (essential dependency per scenario plan)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Generate a random non-existent refresh token
  const fakeRefresh: string = typia.random<string & tags.Format<"uuid">>();
  // 3-4. Attempt refresh with non-existent token, expect 404 rejection
  await TestValidator.httpError(
    "non-existent refresh token rejected",
    404,
    async () => {
      await authorize_member_refresh(
        { host: connection.host },
        {
          body: {
            refresh: fakeRefresh,
          } satisfies ICommunityPlatformMember.IRefresh,
        },
      );
    },
  );
}
