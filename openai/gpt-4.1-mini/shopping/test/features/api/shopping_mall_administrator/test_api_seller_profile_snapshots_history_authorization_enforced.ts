import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshots_history_authorization_enforced(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that accessing seller profile snapshots history endpoint
  // without proper administrator authorization fails with an error.
  // Create a connection without authorization headers to simulate unauthenticated access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare a dummy request body that could be empty or random valid request
  const requestBody: IShoppingMallSellerProfileSnapshot.IRequest = {};
  // Expect calling the history endpoint without authentication to throw HTTP error 401 or 403
  await TestValidator.httpError(
    "unauthorized access to seller profile snapshots history",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sellerProfileSnapshots.history.index(
        unauthorizedConnection,
        { body: requestBody },
      );
    },
  );
}
