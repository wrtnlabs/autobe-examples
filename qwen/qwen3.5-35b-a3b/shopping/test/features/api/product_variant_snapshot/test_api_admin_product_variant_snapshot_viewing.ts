import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_product_variant_snapshot_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Generate test data - valid UUIDs for product, variant, and snapshot
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Admin retrieves product variant snapshot
  const snapshot =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot has valid ID
  TestValidator.equals("snapshot id matches input", snapshot.id, snapshotId);
  // 5. Validate SKU code is present and non-empty
  TestValidator.notEquals("SKU code is non-empty", snapshot.sku_code, "");
  // 6. Validate options JSON string is present
  TestValidator.notEquals("options JSON is non-empty", snapshot.options, "");
  // 7. Validate price is positive number
  TestValidator.predicate("price is positive", snapshot.price > 0);
  // 8. Validate stock quantity is valid int32
  TestValidator.predicate(
    "stock quantity is non-negative",
    snapshot.stock_quantity >= 0,
  );
  // 9. Validate status field is present
  TestValidator.notEquals("status is non-empty", snapshot.status, "");
  // 10. Validate created_at timestamp
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(snapshot.created_at)),
  );
  // 11. Validate parent product reference
  TestValidator.notEquals(
    "product reference id exists",
    snapshot.product.id,
    "",
  );
  TestValidator.notEquals("product name is present", snapshot.product.name, "");
  TestValidator.predicate(
    "product base price is positive",
    snapshot.product.base_price > 0,
  );
  TestValidator.notEquals("product slug is present", snapshot.product.slug, "");
  TestValidator.notEquals(
    "product category id exists",
    snapshot.product.category.id,
    "",
  );
  TestValidator.notEquals(
    "product category name is present",
    snapshot.product.category.name,
    "",
  );
  // 12. Validate source variant reference
  TestValidator.notEquals(
    "variant reference id exists",
    snapshot.productVariant.id,
    "",
  );
  TestValidator.notEquals(
    "variant SKU is present",
    snapshot.productVariant.sku,
    "",
  );
  TestValidator.notEquals(
    "variant options object is populated",
    JSON.stringify(snapshot.productVariant.options),
    "{}",
  );
  TestValidator.predicate(
    "variant base price is positive",
    snapshot.productVariant.basePrice > 0,
  );
  TestValidator.notEquals(
    "variant status is present",
    snapshot.productVariant.status,
    "",
  );
  TestValidator.notEquals(
    "variant parent product exists",
    snapshot.productVariant.product.id,
    "",
  );
}
