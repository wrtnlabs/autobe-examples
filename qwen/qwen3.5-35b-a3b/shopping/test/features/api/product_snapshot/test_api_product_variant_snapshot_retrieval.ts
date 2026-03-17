import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test product variant snapshot retrieval workflow.
 * 1. Register a new seller account
 * 2. Retrieve a product variant snapshot
 * 3. Validate the snapshot structure and fields
 */
export async function test_api_product_variant_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Retrieve snapshot (may return 404 since no products exist in test)
  const snapshot =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // 3. Validate snapshot structure
  typia.assert(snapshot);
  // 4. Validate required fields exist and have correct types
  TestValidator.equals("snapshot id exists", snapshot.id !== undefined, true);
  TestValidator.equals(
    "snapshot sku_code exists",
    snapshot.sku_code.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot options is string",
    typeof snapshot.options === "string",
    true,
  );
  TestValidator.equals(
    "snapshot price is number",
    typeof snapshot.price === "number",
    true,
  );
  TestValidator.equals(
    "snapshot stock_quantity is int32",
    Number.isInteger(snapshot.stock_quantity),
    true,
  );
  TestValidator.equals(
    "snapshot status exists",
    snapshot.status.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot created_at exists",
    snapshot.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot product joined",
    snapshot.product.id !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot productVariant joined",
    snapshot.productVariant.id !== undefined,
    true,
  );
}
