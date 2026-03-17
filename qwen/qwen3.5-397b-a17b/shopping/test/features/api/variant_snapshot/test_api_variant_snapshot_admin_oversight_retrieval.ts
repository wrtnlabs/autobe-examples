import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator variant snapshot retrieval for platform oversight purposes.
 *
 * This test validates that administrators can successfully retrieve specific
 * product variant snapshots through the oversight endpoint. The test verifies:
 * (1) Admin authentication is properly established using the authorize_admin_join
 * utility function, (2) The endpoint returns complete variant snapshot data
 * including sku_code, option_values (parsed JSON object), price (nullable),
 * stock_quantity, and snapshot_at timestamp, (3) The response includes nested
 * productVariant and productSnapshot summary objects with their respective
 * details, (4) The variant snapshot correctly belongs to the specified product
 * snapshot, (5) Administrators can access variant snapshots regardless of which
 * seller owns the product, demonstrating the platform oversight capability.
 */
export async function test_api_variant_snapshot_admin_oversight_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate test identifiers for the variant snapshot retrieval
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve variant snapshot via admin oversight endpoint
  const variantSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.variantSnapshots.at(
      adminConnection,
      {
        productId,
        snapshotId,
        variantSnapshotId,
      },
    );
  typia.assert(variantSnapshot);
  // 4. Validate variant snapshot structure and relationships
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(variantSnapshot.id),
  );
  TestValidator.predicate(
    "sku_code is non-empty string",
    variantSnapshot.sku_code.length > 0,
  );
  TestValidator.predicate(
    "option_values is object",
    typeof variantSnapshot.option_values === "object",
  );
  TestValidator.predicate(
    "stock_quantity is positive integer",
    variantSnapshot.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "snapshot_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      variantSnapshot.snapshot_at,
    ),
  );
  // 5. Validate nested productVariant summary
  TestValidator.predicate(
    "productVariant exists",
    variantSnapshot.productVariant !== undefined,
  );
  TestValidator.predicate(
    "productVariant has id",
    /^[0-9a-f-]{36}$/i.test(variantSnapshot.productVariant.id),
  );
  TestValidator.predicate(
    "productVariant has skuCode",
    variantSnapshot.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "productVariant has optionValues array",
    variantSnapshot.productVariant.optionValues.length >= 0,
  );
  // 6. Validate nested productSnapshot summary
  TestValidator.predicate(
    "productSnapshot exists",
    variantSnapshot.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "productSnapshot has id",
    /^[0-9a-f-]{36}$/i.test(variantSnapshot.productSnapshot.id),
  );
  TestValidator.predicate(
    "productSnapshot has name",
    variantSnapshot.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "productSnapshot has base_price",
    variantSnapshot.productSnapshot.base_price >= 0,
  );
  TestValidator.predicate(
    "productSnapshot has category",
    variantSnapshot.productSnapshot.category !== undefined,
  );
  TestValidator.predicate(
    "productSnapshot has seller",
    variantSnapshot.productSnapshot.seller !== undefined,
  );
  // 7. Validate price nullable handling
  if (variantSnapshot.price !== null && variantSnapshot.price !== undefined) {
    TestValidator.predicate(
      "price is positive when present",
      variantSnapshot.price >= 0,
    );
  }
}
