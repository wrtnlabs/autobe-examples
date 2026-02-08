import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_snapshots_filtered_listing(
  connection: api.IConnection,
): Promise<void> {
  // Seller join and obtain authorized connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {}, // IShoppingMallSeller.IJoin is empty object per DTO
  });
  typia.assert(authorizedSeller);
  // Create new connection authorized with seller token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // Call the sale snapshots index endpoint with empty filter body (empty IRequest type)
  const page: IPageIShoppingMallSaleSnapshot.ISummary =
    await api.functional.shoppingMall.seller.sale_snapshots.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(page);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page positive",
    page.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  // Validate all sale snapshots record existence and valid
  for (const snapshot of page.data) {
    typia.assert(snapshot); // ISummary is an empty type so only existence validation
  }
}
