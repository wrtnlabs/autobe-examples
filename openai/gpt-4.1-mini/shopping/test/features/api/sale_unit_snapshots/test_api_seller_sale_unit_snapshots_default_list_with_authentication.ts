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

export async function test_api_seller_sale_unit_snapshots_default_list_with_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    });
  typia.assert(authorized);
  // Add authorization header
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = authorized.token.access;
  // 2. Call sale unit snapshots index API with empty filter (default listing)
  const output: IPageIShoppingMallSaleUnitSnapshot.ISummary =
    await api.functional.shoppingMall.seller.sale_unit_snapshots.index(
      sellerConnection,
      {
        body: {}, // Empty body for no filters/default
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent",
    pagination.pages === 0 ||
      (pagination.pages >= 1 && pagination.records >= 0),
  );
  // 4. Validate data array and basic structure
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // 5. For each snapshot, validate presence of critical known fields
  output.data.forEach((snapshot, i) => {
    // We cannot validate fields not specified, so just ensure snapshot is non-null
    TestValidator.predicate(
      `snapshot[${i}] is object`,
      typeof snapshot === "object" && snapshot !== null,
    );
    // Verify known fields if any, but schema has no explicit properties so typia.assert only
  });
}
