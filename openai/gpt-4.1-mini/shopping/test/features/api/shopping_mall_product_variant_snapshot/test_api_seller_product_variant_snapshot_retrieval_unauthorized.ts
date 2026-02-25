import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_product_variant_snapshot_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that accessing a product variant snapshot without authentication
  // is forbidden and returns appropriate HTTP error code (401 or 403).
  // Prepare arbitrary UUIDs for productId, variantId and snapshotId to target the resource.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access the resource via the SDK function directly without authorization
  await TestValidator.httpError(
    "should not allow unauthorized product variant snapshot access",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.products.variants.snapshots.at(
        connection,
        {
          productId,
          variantId,
          snapshotId,
        },
      );
    },
  );
}
