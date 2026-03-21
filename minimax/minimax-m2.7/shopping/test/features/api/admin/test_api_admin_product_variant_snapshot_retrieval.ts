import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_product_variant_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator via /auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Retrieve the variant snapshot via the target endpoint
  // Using simulated IDs for the test - in real scenario, these would come from
  // actual product/variant/snapshot creation steps
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshot =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
      },
    );
  typia.assert(variantSnapshot);
  // 3. Validate response structure
  // Validate snapshotId exists
  TestValidator.equals(
    "snapshotId is valid UUID",
    variantSnapshot.id,
    snapshotId,
  );
  // Validate SKU code exists
  TestValidator.predicate(
    "SKU code is string and not empty",
    typeof variantSnapshot.sku === "string" && variantSnapshot.sku.length > 0,
  );
  // Validate createdAt timestamp exists and is valid ISO datetime
  TestValidator.predicate(
    "createdAt is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(variantSnapshot.created_at),
  );
  // Validate price_override can be null or number
  TestValidator.predicate(
    "price_override is number or null",
    variantSnapshot.price_override === null ||
      typeof variantSnapshot.price_override === "number",
  );
  // Validate stock_quantity is integer
  TestValidator.predicate(
    "stock_quantity is integer",
    Number.isInteger(variantSnapshot.stock_quantity),
  );
  // Validate optionValues array exists
  TestValidator.predicate(
    "optionValues is array",
    Array.isArray(variantSnapshot.optionValues),
  );
  // Validate each option value has required properties
  for (const optionValue of variantSnapshot.optionValues) {
    typia.assert(optionValue);
    TestValidator.predicate(
      "option key is non-empty string",
      typeof optionValue.key === "string" && optionValue.key.length > 0,
    );
    TestValidator.predicate(
      "option value is non-empty string",
      typeof optionValue.value === "string" && optionValue.value.length > 0,
    );
  }
  // Validate parent productSnapshot context exists
  typia.assert(variantSnapshot.productSnapshot);
  TestValidator.equals(
    "productSnapshot has id",
    variantSnapshot.productSnapshot.id !== undefined,
    true,
  );
  TestValidator.predicate(
    "productSnapshot has name",
    typeof variantSnapshot.productSnapshot.name === "string",
  );
  TestValidator.predicate(
    "productSnapshot has description",
    typeof variantSnapshot.productSnapshot.description === "string",
  );
  TestValidator.predicate(
    "productSnapshot base_price is number",
    typeof variantSnapshot.productSnapshot.base_price === "number",
  );
  TestValidator.predicate(
    "productSnapshot category_name is string",
    typeof variantSnapshot.productSnapshot.category_name === "string",
  );
  TestValidator.predicate(
    "productSnapshot created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      variantSnapshot.productSnapshot.created_at,
    ),
  );
  // Validate seller context in productSnapshot
  typia.assert(variantSnapshot.productSnapshot.seller);
  TestValidator.predicate(
    "seller has id",
    variantSnapshot.productSnapshot.seller.id !== undefined,
  );
  TestValidator.predicate(
    "seller has email",
    typeof variantSnapshot.productSnapshot.seller.email === "string",
  );
  TestValidator.predicate(
    "seller has approval_status",
    typeof variantSnapshot.productSnapshot.seller.approval_status === "string",
  );
}
