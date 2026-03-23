import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_seller_suspensions_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Store original refresh token
  const originalRefreshToken = seller.token.refresh;
  // 3. Test successful token refresh
  const refreshed = await authorize_seller_refresh(sellerConnection, {
    body: {
      refreshToken: originalRefreshToken,
      id: seller.id,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  // Verify tokens are different (rotation happened)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 4. Verify old token is invalidated
  await TestValidator.error("old refresh token rejected", async () => {
    await api.functional.ecommerceMall.auth.seller.refresh(sellerConnection, {
      body: {
        refreshToken: originalRefreshToken,
        id: seller.id,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
  // 5. Test token refresh with suspended seller
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  const suspendedSeller = await authorize_seller_join(
    suspendedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(suspendedSeller);
  const suspendedRefreshToken = suspendedSeller.token.refresh;
  // Suspend the seller
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const suspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
      adminConnection,
      {
        body: {
          seller_id: suspendedSeller.id,
          reason: "Test suspension for token refresh validation",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // Attempt refresh with suspended seller
  await TestValidator.error("suspended seller refresh rejected", async () => {
    await api.functional.ecommerceMall.auth.seller.refresh(
      suspendedSellerConnection,
      {
        body: {
          refreshToken: suspendedRefreshToken,
          id: suspendedSeller.id,
        } satisfies IEcommerceMallSeller.IRefresh,
      },
    );
  });
  // 6. Test invalid refresh token formats
  await TestValidator.error("invalid UUID format rejected", async () => {
    await api.functional.ecommerceMall.auth.seller.refresh(sellerConnection, {
      body: {
        refreshToken: "not-a-uuid",
        id: seller.id,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
  // 7. Test non-existent refresh token
  await TestValidator.error("non-existent token rejected", async () => {
    await api.functional.ecommerceMall.auth.seller.refresh(sellerConnection, {
      body: {
        refreshToken: typia.random<string & tags.Format<"uuid">>(),
        id: seller.id,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
}
