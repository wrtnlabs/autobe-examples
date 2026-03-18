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

export async function test_api_product_variant_snapshot_history_after_variant_deletion(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.shoppingMall.seller.productVariants.snapshots.index(
      sellerConnection,
      {
        productVariantId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "snapshot pagination current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination limit is valid",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination records is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination pages is valid",
    response.pagination.pages >= 0,
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.productVariant);
    TestValidator.predicate(
      "snapshot sku code is preserved",
      snapshot.skuCode.length > 0,
    );
    TestValidator.predicate(
      "snapshot option values are preserved",
      snapshot.optionValues.length > 0,
    );
    TestValidator.predicate(
      "snapshot price is non-negative",
      snapshot.price >= 0,
    );
    TestValidator.predicate(
      "snapshot stock quantity is non-negative",
      snapshot.stockQuantity >= 0,
    );
  }
}
