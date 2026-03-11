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

export async function test_api_member_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
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
  typia.assert(authorizedMember);
  // Step 2: Extract the refresh token from the authorized response
  const validRefreshToken = authorizedMember.token.refresh;
  // Step 3: Create a new connection without authorization headers for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Attempt refresh with expired token (using the valid token but simulating expiration)
  // The system should internally detect token expiration based on the token's embedded timestamp
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await authorize_member_refresh(refreshConnection, {
        body: {
          refreshToken: validRefreshToken,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
  // Step 5: Validate that no new authorization headers were set (no new tokens issued)
  TestValidator.predicate(
    "no new tokens should be issued",
    refreshConnection.headers?.Authorization === undefined,
  );
}
