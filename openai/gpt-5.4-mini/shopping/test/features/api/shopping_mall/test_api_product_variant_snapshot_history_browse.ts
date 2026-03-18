import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerBody,
  });
  typia.assert(sellerAuthorized);
  const response =
    await api.functional.shoppingMall.seller.productVariants.snapshots.index(
      sellerConnection,
      {
        productVariantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "snapshot pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot pagination limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot.productVariant);
    TestValidator.predicate(
      "snapshot SKU code is preserved as a non-empty string",
      snapshot.skuCode.length > 0,
    );
    TestValidator.predicate(
      "snapshot option values is preserved as a non-empty string",
      snapshot.optionValues.length > 0,
    );
    TestValidator.predicate(
      "snapshot created at is a non-empty timestamp string",
      snapshot.createdAt.length > 0,
    );
  }
  const secondPage =
    await api.functional.shoppingMall.seller.productVariants.snapshots.index(
      sellerConnection,
      {
        productVariantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page pagination current",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page pagination limit",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "second page data length does not exceed limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
}
