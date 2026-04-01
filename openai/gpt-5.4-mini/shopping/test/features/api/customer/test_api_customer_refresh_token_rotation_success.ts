import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_token_rotation_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const originalToken = joined.token;
  const originalRefreshToken = originalToken.refresh;
  const originalAccessToken = originalToken.access;
  const originalExpiredAt = originalToken.expired_at;
  const originalRefreshableUntil = originalToken.refreshable_until;
  const refreshed = await authorize_customer_refresh(customerConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IMallPlatformCustomer.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "customer id should be preserved after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email should be preserved after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "customer status should remain active after refresh",
    refreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "refresh response should preserve createdAt",
    refreshed.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "refresh response should preserve deletedAt",
    refreshed.deletedAt,
    joined.deletedAt,
  );
  TestValidator.notEquals(
    "access token should be rotated",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "access expiration should be refreshed",
    refreshed.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "refreshable-until metadata should be refreshed",
    refreshed.token.refreshable_until,
    originalRefreshableUntil,
  );
  const secondRefreshToken = refreshed.token.refresh;
  if (secondRefreshToken !== originalRefreshToken) {
    const rotated = await authorize_customer_refresh(customerConnection, {
      body: {
        refreshToken: secondRefreshToken,
      } satisfies IMallPlatformCustomer.IRefresh,
    });
    typia.assert(rotated);
    TestValidator.equals(
      "rotated refresh should keep same customer id",
      rotated.id,
      joined.id,
    );
    TestValidator.equals(
      "rotated refresh should keep same email",
      rotated.email,
      joined.email,
    );
    TestValidator.equals(
      "rotated refresh should keep active status",
      rotated.status,
      joined.status,
    );
    TestValidator.notEquals(
      "rotated access token should differ from first refresh",
      rotated.token.access,
      refreshed.token.access,
    );
    TestValidator.notEquals(
      "rotated refresh token should differ from first refresh",
      rotated.token.refresh,
      refreshed.token.refresh,
    );
    TestValidator.notEquals(
      "rotated access expiry should differ from first refresh",
      rotated.token.expired_at,
      refreshed.token.expired_at,
    );
    TestValidator.notEquals(
      "rotated refreshable-until should differ from first refresh",
      rotated.token.refreshable_until,
      refreshed.token.refreshable_until,
    );
    await TestValidator.error(
      "old refresh token should be rejected after rotation",
      async () => {
        await authorize_customer_refresh(customerConnection, {
          body: {
            refreshToken: originalRefreshToken,
          } satisfies IMallPlatformCustomer.IRefresh,
        });
      },
    );
  } else {
    TestValidator.equals(
      "refresh token may be reissued unchanged",
      secondRefreshToken,
      originalRefreshToken,
    );
  }
}
