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

export async function test_api_seller_sales_unit_snapshots_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // The scenario tests that unauthorized access to sale unit snapshots is denied
  // Create two seller actors: one for authorized seller and one for unauthorized seller
  // Seller A joins (authorized user)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerA1234!",
      shopName: "Seller A Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Seller B joins (unauthorized user for this test)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerB1234!",
      shopName: "Seller B Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Prepare invalid/non-authenticated connection (no headers)
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Generate random UUIDs for saleId and unitId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const unitId = typia.random<string & tags.Format<"uuid">>();
  // Create empty request body
  const body: IShoppingMallSaleUnitSnapshot.IRequest = {};
  // Attempt unauthorized access: anonymous user (no auth)
  await TestValidator.httpError(
    "anonymous user should be denied access to sale unit snapshots",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
        anonymousConnection,
        {
          saleId,
          unitId,
          body,
        },
      );
    },
  );
  // Attempt unauthorized access: sellerB tries to access sellerA's sale unit snapshots
  await TestValidator.httpError(
    "unauthorized seller should be denied access to another seller's sale unit snapshots",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
        sellerBConnection,
        {
          saleId,
          unitId,
          body,
        },
      );
    },
  );
  // Note: We do not test success path here because it's out of scope
}
