import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_images_index_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(
    { host: connection.host },
    { body: {} },
  );
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Call index endpoint with empty filter ({}), as no filter details present in DTO
  const output = await api.functional.shoppingMall.seller.sale_images.index(
    sellerConnection,
    { body: {} },
  );
  // Assert the output fully satisfies the response type
  typia.assert(output);
  // Pagination metadata check
  TestValidator.predicate("current page >= 1", output.pagination.current >= 1);
  TestValidator.predicate("limit > 0", output.pagination.limit > 0);
  TestValidator.predicate(
    "records >= data length",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pages calculation",
    output.pagination.pages === 0 ||
      output.pagination.pages ===
        Math.ceil(output.pagination.records / output.pagination.limit),
  );
  // Data array validation - each item should be valid IShoppingMallSaleImage.ISummary
  for (const item of output.data) {
    typia.assert(item);
  }
}
