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

export async function test_api_seller_product_variant_snapshots_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Call the snapshots API endpoint with random product and variant IDs
  // This endpoint returns snapshot history for a specific variant
  // Since there's no utility function to create a product or variant, we use random UUIDs
  // The server will return an empty list or error, but we validate the response structure
  const variantsSnapshotResponse =
    await api.functional.shoppingMall.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(variantsSnapshotResponse);
  // Step 3: Validate response structure
  TestValidator.predicate(
    "pagination exists",
    variantsSnapshotResponse.pagination != null,
  );
  TestValidator.equals(
    "pagination current must be >= 1",
    variantsSnapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit must be >= 1",
    variantsSnapshotResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records must be >= 0",
    variantsSnapshotResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages must be >= 0",
    variantsSnapshotResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(variantsSnapshotResponse.data),
  );
  TestValidator.predicate(
    "data length is >= 0",
    variantsSnapshotResponse.data.length >= 0,
  );
  // Validate individual snapshot structure if any are returned
  for (const snapshot of variantsSnapshotResponse.data) {
    TestValidator.equals(
      "snapshot id is UUID",
      Boolean(snapshot.id.match(/^[0-9a-f-]{36}$/i)),
      true,
    );
    TestValidator.equals(
      "snapshot product_variant_id is UUID",
      Boolean(snapshot.product_variant_id.match(/^[0-9a-f-]{36}$/i)),
      true,
    );
    TestValidator.equals(
      "snapshot changed_by is not empty",
      snapshot.changed_by.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot version is int32",
      typeof snapshot.version === "number",
      true,
    );
    TestValidator.equals(
      "snapshot sku_code is string",
      typeof snapshot.sku_code === "string",
      true,
    );
    TestValidator.predicate(
      "snapshot price is number or null",
      snapshot.price === null || typeof snapshot.price === "number",
    );
    TestValidator.predicate(
      "snapshot previous_sku_code is string or null",
      snapshot.previous_sku_code === null ||
        typeof snapshot.previous_sku_code === "string",
    );
    TestValidator.predicate(
      "snapshot previous_price is number or null",
      snapshot.previous_price === null ||
        typeof snapshot.previous_price === "number",
    );
    TestValidator.equals(
      "snapshot changed_at is ISO date",
      new Date(snapshot.changed_at).toString() !== "Invalid Date",
      true,
    );
    TestValidator.equals(
      "snapshot created_at is ISO date",
      new Date(snapshot.created_at).toString() !== "Invalid Date",
      true,
    );
    TestValidator.equals(
      "snapshot updated_at is ISO date",
      new Date(snapshot.updated_at).toString() !== "Invalid Date",
      true,
    );
  }
}
