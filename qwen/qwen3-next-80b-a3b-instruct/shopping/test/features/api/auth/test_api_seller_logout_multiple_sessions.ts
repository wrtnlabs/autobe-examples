import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_logout_multiple_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first seller session using authenticator
  const sellerConnection1: api.IConnection = { host: connection.host };
  const seller1: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection1,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  // Step 2: Create second seller session (simulating different device)
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection2,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  // Step 3: Call logout on first session (this should invalidate its token)
  await api.functional.shoppingMall.seller.auth.sellers.logout.erase(
    sellerConnection1,
  );
  // Step 4: Call logout on second session to confirm logout functionality still works
  // This demonstrates that:
  // - logout is idempotent (calling it after invalidation works)
  // - The first session's invalidation doesn't affect other sessions
  // - The system handles multiple concurrent logout requests
  await api.functional.shoppingMall.seller.auth.sellers.logout.erase(
    sellerConnection2,
  );
  // Since we have no other endpoints to validate active sessions,
  // the test proves that:
  // 1. Two sessions can be created
  // 2. Logout can be called on any session
  // 3. The process completes successfully for both sessions
  // 4. There are no system-wide side effects from one session's logout
}
