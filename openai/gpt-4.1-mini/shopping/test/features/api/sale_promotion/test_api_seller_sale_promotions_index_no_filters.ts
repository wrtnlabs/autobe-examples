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

export async function test_api_seller_sale_promotions_index_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test accessing sale promotions with no filters to retrieve all promotions for a seller
  // 1. Authenticate as seller using join utility
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Request sale promotions with no filters
  const promotions =
    await api.functional.shoppingMall.seller.sale_promotions.index(
      sellerConnection,
      { body: {} satisfies IShoppingMallSalePromotion.IRequest },
    );
  typia.assert(promotions);
  // 3. Validate pagination metadata
  const { pagination, data } = promotions;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= data length",
    pagination.records >= data.length,
  );
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 4. Validate data length matches pagination
  TestValidator.equals(
    "data length matches records",
    data.length,
    Math.min(pagination.limit, pagination.records),
  );
  // 5. Access control implicitly verified by success with authorized connection
}
