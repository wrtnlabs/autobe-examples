import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_rejects_rotated_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Join to obtain initial refresh token
  const joined = await authorize_member_join(memberConnection, {});
  typia.assert(joined);
  const originalRefreshToken = joined.token.refresh;
  // 2) First refresh to trigger rotation
  const refreshConnection1: api.IConnection = { host: connection.host };
  const rotatedAuth = await authorize_member_refresh(refreshConnection1, {
    body: {
      refreshToken: originalRefreshToken,
    },
  });
  typia.assert(rotatedAuth);
  const rotatedRefreshToken = rotatedAuth.token.refresh;
  TestValidator.notEquals(
    "refresh token should rotate after successful refresh",
    originalRefreshToken,
    rotatedRefreshToken,
  );
  // 3) Second refresh using old refresh token should be rejected
  const compromisedConnection: api.IConnection = { host: connection.host };
  let leakedMessage: string | undefined;
  await TestValidator.httpError(
    "should reject reuse of rotated refresh token",
    401,
    async () => {
      try {
        await authorize_member_refresh(compromisedConnection, {
          body: {
            refreshToken: originalRefreshToken,
          },
        });
      } catch (exp) {
        // best-effort capture without relying on runtime error class identity
        if (typeof exp === "object" && exp !== null) {
          const maybe = exp as {
            message?: unknown;
            toJSON?:
              | (() => {
                  message?: unknown;
                })
              | undefined;
          };
          if (typeof maybe.message === "string") {
            leakedMessage = maybe.message;
          } else if (typeof maybe.toJSON === "function") {
            const json = maybe.toJSON();
            if (typeof json.message === "string") leakedMessage = json.message;
          }
        }
        throw exp;
      }
    },
  );
  // Validate error message doesn't leak internal identifiers (if message is available)
  if (leakedMessage !== undefined) {
    const forbiddenSubstrings = [
      "session",
      "member_session",
      "refresh_token_id",
      "token_id",
      "jti",
      "internal",
      "memberId",
      "member_id",
    ];
    for (const s of forbiddenSubstrings) {
      TestValidator.predicate(
        `error message should not leak internal identifier: ${s}`,
        !leakedMessage.includes(s),
      );
    }
  }
  // 4) Refresh using the latest rotated refresh token should still work
  const refreshConnection2: api.IConnection = { host: connection.host };
  const renewed = await authorize_member_refresh(refreshConnection2, {
    body: {
      refreshToken: rotatedRefreshToken,
    },
  });
  typia.assert(renewed);
  TestValidator.notEquals(
    "refresh token should rotate again after subsequent refresh",
    rotatedRefreshToken,
    renewed.token.refresh,
  );
}
