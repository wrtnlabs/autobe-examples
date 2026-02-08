import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_unit_snapshots_filter_active_sorted_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Update authorized connection with access token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call endpoint unauthenticated (should fail)
  await TestValidator.httpError(
    "unauthenticated access forbidden",
    401,
    async () => {
      const anonymousConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.seller.sale_unit_snapshots.index(
        anonymousConnection,
        {
          body: {},
        },
      );
    },
  );
  // 3. Call endpoint with invalid token (should fail with forbidden)
  await TestValidator.httpError(
    "unauthorized access forbidden",
    403,
    async () => {
      const badAuthConnection: api.IConnection = { host: connection.host };
      badAuthConnection.headers = { Authorization: "Bearer invalidtoken" };
      await api.functional.shoppingMall.seller.sale_unit_snapshots.index(
        badAuthConnection,
        {
          body: {},
        },
      );
    },
  );
  // 4. Call with valid token, request snapshots
  const output =
    await api.functional.shoppingMall.seller.sale_unit_snapshots.index(
      sellerConnection,
      {
        body: {},
      },
    );
  // Assert output type
  typia.assert<IPageIShoppingMallSaleUnitSnapshot.ISummary>(output);
  // Validate pagination
  TestValidator.predicate(
    "pagination.current >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    output.pagination.pages >= 0,
  );
  // Validate data array length
  TestValidator.predicate(
    "data length <= pagination.limit",
    output.data.length <= output.pagination.limit,
  );
  // Assert each item in data
  for (const snapshot of output.data) {
    typia.assert(snapshot);
  }
}
