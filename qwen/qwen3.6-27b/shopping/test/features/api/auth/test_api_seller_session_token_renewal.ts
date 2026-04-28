import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_session_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialResponse = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  typia.assert(initialResponse);
  // 2. Extract initial refresh token
  const initialRefreshToken = initialResponse.token.refresh;
  TestValidator.equals(
    "initial response has valid refresh token",
    initialRefreshToken.length > 0,
    true,
  );
  // 3. Renew session using the refresh token
  const refreshConnection: api.IConnection = { host: joinConnection.host };
  const renewedResponse = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies IEcommercePlatformSeller.IRefresh,
  });
  typia.assert(renewedResponse);
  // 4. Validate renewed tokens and business logic
  TestValidator.equals(
    "renewed response contains access token",
    renewedResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "renewed response contains refresh token",
    renewedResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "seller email matches",
    renewedResponse.email,
    initialResponse.email,
  );
  TestValidator.equals(
    "new refresh token matches request input",
    renewedResponse.token.refresh,
    initialRefreshToken,
  );
  TestValidator.equals(
    "seller ID remains unchanged after token renewal",
    renewedResponse.id,
    initialResponse.id,
  );
  TestValidator.equals(
    "renewed token has future refreshable_until time",
    renewedResponse.token.refreshable_until > new Date().toISOString(),
    true,
  );
}
