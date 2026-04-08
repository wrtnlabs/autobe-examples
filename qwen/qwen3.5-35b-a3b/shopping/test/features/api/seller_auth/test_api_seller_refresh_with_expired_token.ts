import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joined);
  // 2. Store initial refresh token
  const initialRefreshToken = joined.token.refresh;
  // 3. Verify seller is approved (required for refresh)
  TestValidator.equals(
    "seller approval status is approved",
    joined.approval_status,
    "approved",
  );
  // 4. Attempt to refresh with the valid refresh token
  const refreshed = await api.functional.ecommerceMall.auth.seller.refresh(
    sellerConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 5. Verify refresh response has new tokens
  TestValidator.equals(
    "access token returned",
    refreshed.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token returned",
    refreshed.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at returned",
    refreshed.token.expired_at.length > 0,
    true,
  );
  // 6. Verify token rotation (new refresh token different from old)
  TestValidator.notEquals(
    "access token rotated",
    initialRefreshToken,
    refreshed.token.access,
  );
  // 7. Verify seller account details remain unchanged
  TestValidator.equals("email unchanged", refreshed.email, joined.email);
  TestValidator.equals(
    "display_name unchanged",
    refreshed.display_name,
    joined.display_name,
  );
  TestValidator.equals(
    "approval_status unchanged",
    refreshed.approval_status,
    joined.approval_status,
  );
}
