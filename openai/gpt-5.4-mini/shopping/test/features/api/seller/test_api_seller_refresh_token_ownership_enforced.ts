import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_token_ownership_enforced(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/sellers/join",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/sellers/join",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerB);
  const originalSellerAAccess = sellerA.token.access;
  const originalSellerARefresh = sellerA.token.refresh;
  await TestValidator.httpError(
    "malformed refresh token should be rejected",
    [400, 401, 403],
    async () => {
      await api.functional.mallPlatform.auth.seller.refresh(sellerAConnection, {
        body: {
          refreshToken: typia.random<string & tags.Format<"password">>(),
        } satisfies IMallPlatformSeller.IRefresh,
      });
    },
  );
  await TestValidator.httpError(
    "cross-account refresh token should be rejected",
    [400, 401, 403],
    async () => {
      await api.functional.mallPlatform.auth.seller.refresh(sellerAConnection, {
        body: {
          refreshToken: sellerB.token.refresh,
        } satisfies IMallPlatformSeller.IRefresh,
      });
    },
  );
  TestValidator.equals(
    "seller A access token remains unchanged",
    sellerA.token.access,
    originalSellerAAccess,
  );
  TestValidator.equals(
    "seller A refresh token remains unchanged",
    sellerA.token.refresh,
    originalSellerARefresh,
  );
}
