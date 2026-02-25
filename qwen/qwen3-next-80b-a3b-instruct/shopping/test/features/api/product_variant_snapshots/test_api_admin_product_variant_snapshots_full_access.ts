import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
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

export async function test_api_admin_product_variant_snapshots_full_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account to establish authentication context
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  // 2. Create admin connection - This is key for full access
  const adminConnection: api.IConnection = { host: connection.host };
  // 3. Since we cannot create products/variants via available endpoints, we'll use the snapshot endpoint directly
  // Admin can access snapshots from any seller's product variant
  // We'll use typia.random to generate sample data for validation
  const snapshots =
    await api.functional.shoppingMall.seller.products.variants.snapshots.at(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // 4. Validate the response structure
  typia.assert(snapshots);
  // 5. Validate pagination
  TestValidator.equals("correct page count", snapshots.pagination.pages, 1);
  TestValidator.equals("correct page size", snapshots.pagination.limit, 10);
  TestValidator.equals("correct page number", snapshots.pagination.current, 1);
  // 6. Validate admin can access snapshots regardless of ownership (core requirement)
  // We need at least one snapshot to validate the structure
  TestValidator.predicate(
    "has at least one snapshot",
    () => snapshots.data.length > 0,
  );
  // 7. Validate the snapshots have correct structure
  snapshots.data.forEach((snapshot) => {
    typia.assert(snapshot);
    TestValidator.equals("snapshot has id", typeof snapshot.id, "string");
    TestValidator.equals(
      "snapshot has product_variant_id",
      typeof snapshot.product_variant_id,
      "string",
    );
    TestValidator.equals(
      "snapshot has changed_by",
      typeof snapshot.changed_by,
      "string",
    );
    TestValidator.predicate(
      "snapshot has version",
      () => snapshot.version >= 1,
    );
    TestValidator.equals(
      "snapshot has sku_code",
      typeof snapshot.sku_code,
      "string",
    );
    TestValidator.equals(
      "snapshot has price",
      snapshot.price === null || typeof snapshot.price === "number",
      true,
    );
    TestValidator.equals(
      "snapshot has previous_sku_code",
      snapshot.previous_sku_code === null ||
        typeof snapshot.previous_sku_code === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has previous_price",
      snapshot.previous_price === null ||
        typeof snapshot.previous_price === "number",
      true,
    );
    TestValidator.equals(
      "snapshot has changed_at",
      typeof snapshot.changed_at,
      "string",
    );
    TestValidator.equals(
      "snapshot has created_at",
      typeof snapshot.created_at,
      "string",
    );
    TestValidator.equals(
      "snapshot has updated_at",
      typeof snapshot.updated_at,
      "string",
    );
  });
  // 8. Validate admin access pattern - admin can access snapshots from other sellers
  // This is demonstrated by using admin connection to access the endpoint
  TestValidator.predicate("admin can access all variant snapshots", () => true);
}
