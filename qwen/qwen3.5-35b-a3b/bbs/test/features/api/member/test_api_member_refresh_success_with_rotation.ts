import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_success_with_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Store initial tokens and user ID
  const initialAccessToken = joinResponse.token.access;
  const initialRefreshToken = joinResponse.token.refresh;
  const initialUserId = joinResponse.id;
  const initialAccessExpiredAt = joinResponse.token.expired_at;
  const initialRefreshableUntil = joinResponse.token.refreshable_until;
  // 3. Refresh token using initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies IEconomicPoliticalBoardMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Verify response contains new access and refresh tokens
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newAccessExpiredAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;
  // 5. Verify user ID matches
  TestValidator.equals("user ID matches", refreshResponse.id, initialUserId);
  // 6. Verify new tokens are different from initial tokens (rotation occurred)
  TestValidator.notEquals(
    "new access token differs",
    newAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    newRefreshToken,
    initialRefreshToken,
  );
  // 7. Verify token rotation - attempt to use old refresh token (should fail)
  const retryConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_member_refresh(retryConnection, {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IEconomicPoliticalBoardMember.IRefresh,
    });
    throw new Error("Should have thrown for expired refresh token");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "old refresh token rejected with 401",
        error.status,
        401,
      );
    } else {
      throw error;
    }
  }
  // 8. Verify new refresh token can successfully refresh again
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResponse = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: newRefreshToken,
      } satisfies IEconomicPoliticalBoardMember.IRefresh,
    },
  );
  typia.assert(secondRefreshResponse);
  // 9. Verify user ID still matches in second refresh
  TestValidator.equals(
    "user ID matches in second refresh",
    secondRefreshResponse.id,
    initialUserId,
  );
}