import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_seller_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new seller account
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = typia.random<string>();
  const initialSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(initialSeller);
  // Step 2: Refresh session
  const refreshResult = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: initialSeller.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Verify tokens have rotated
  TestValidator.notEquals(
    "Access token should differ after refresh",
    refreshResult.token.access,
    initialSeller.token.access,
  );
  TestValidator.notEquals(
    "Refresh token should differ after refresh",
    refreshResult.token.refresh,
    initialSeller.token.refresh,
  );
  // Step 4: Verify token validity
  TestValidator.predicate(
    "Refresh token should have refreshable_until time in future",
    new Date(refreshResult.token.refreshable_until).getTime() > Date.now(),
  );
}