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

export async function test_api_member_refresh_success_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const originalAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(originalAuth);
  // 2. Extract the original tokens for comparison
  const originalRefreshToken = originalAuth.refresh;
  const originalAccessToken = originalAuth.access;
  // 3. Refresh tokens using the original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const newAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IEcommerceMallMember.IRefresh,
  });
  typia.assert(newAuth);
  // 4. Validate that tokens have been rotated (new tokens differ from original)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    newAuth.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    newAuth.refresh,
  );
  // 5. Verify new access token expiration is valid and future-dated
  const newExpiredAt = new Date(newAuth.expired_at);
  TestValidator.predicate(
    "new access token has valid expiration",
    new Date().getTime() < newExpiredAt.getTime(),
  );
  // 6. Verify the old refresh token cannot be reused (token rotation security)
  await TestValidator.error(
    "old refresh token cannot be reused after rotation",
    async () => {
      const invalidRefreshConnection: api.IConnection = {
        host: connection.host,
      };
      await api.functional.ecommerceMall.auth.member.refresh(
        invalidRefreshConnection,
        {
          body: {
            refresh_token: originalRefreshToken,
          } satisfies IEcommerceMallMember.IRefresh,
        },
      );
    },
  );
  // 7. Verify new refresh token can be used to generate yet another set of tokens
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const thirdAuth = await authorize_member_refresh(secondRefreshConnection, {
    body: {
      refresh_token: newAuth.refresh,
    } satisfies IEcommerceMallMember.IRefresh,
  });
  typia.assert(thirdAuth);
  // Validate third set of tokens is also different from second set
  TestValidator.notEquals(
    "third access token rotated from second",
    newAuth.access,
    thirdAuth.access,
  );
}
