import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_promotions_index_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authorize seller join
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Update connection headers with authorization token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare filter body with active true and date range set to now
  const nowISOString = new Date().toISOString();
  const body: IShoppingMallSalePromotion.IRequest = {
    active: true,
    start_at: nowISOString,
    end_at: nowISOString,
    limit: 10,
    page: 1,
  };
  // Call sale promotion index endpoint
  const output = await api.functional.shoppingMall.seller.sale_promotions.index(
    sellerConnection,
    { body },
  );
  // Full output validation
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    output.pagination.limit === 10,
  );
  // Validate each promotion summary structure
  output.data.forEach((promotion) => {
    // Since ISummary has no declared properties, only assert structure
    typia.assert(promotion);
  });
}
