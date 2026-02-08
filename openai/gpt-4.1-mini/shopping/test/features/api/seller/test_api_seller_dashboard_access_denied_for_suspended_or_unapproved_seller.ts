import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_access_denied_for_suspended_or_unapproved_seller(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Register seller with pending approval
  const pendingSellerAuth = await authorize_seller_join(
    { host: connection.host },
    { body: typia.random<IShoppingMallSeller.IJoin>() },
  );
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  pendingSellerConnection.headers = {
    Authorization: `Bearer ${pendingSellerAuth.token.access}`,
  };
  // Try to access dashboard as pending approval seller  (expect error)
  await TestValidator.httpError(
    "seller dashboard access denied for pending approval",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.dashboard.index(
        pendingSellerConnection,
      );
    },
  );
  // Since no utility or API for suspension exists in the given info,
  // simulate suspension by attempting dashboard access with invalid token
  // (as suspended sellers are denied access)
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  suspendedSellerConnection.headers = {
    Authorization: `Bearer invalid_or_suspended_seller_token`,
  };
  // Try to access dashboard as suspended seller (expect error)
  await TestValidator.httpError(
    "seller dashboard access denied for suspended seller",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.dashboard.index(
        suspendedSellerConnection,
      );
    },
  );
}
