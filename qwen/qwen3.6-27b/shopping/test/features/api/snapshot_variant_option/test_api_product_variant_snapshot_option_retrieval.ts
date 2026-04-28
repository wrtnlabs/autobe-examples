import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import type { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of paginated snapshot variant option records for a specific product variant snapshot.
 *
 * Validates the complete admin retrieval workflow for snapshot variant options, which are immutable key-value attribute pairs (e.g., color/Red, size/Large) preserved at the time a product variant was modified. The test authenticates as an admin and retrieves options through the nested resource hierarchy of product → variant → snapshot → options.
 *
 * The primary focus is on verifying that the paginated response includes correct pagination metadata and properly structured option records. Each option record should contain its unique identifier, attribute key and value, creation timestamp, and a reference to the parent variant snapshot context.
 *
 * 1. Administrator registers and authenticates to the ecommerce platform.
 * 2. Random UUIDs are generated for the product, variant, and snapshot identifiers.
 * 3. Admin requests paginated snapshot variant options with optional filters.
 * 4. Validates that response pagination metadata is accurate and option records have proper structure.
 */
export async function test_api_product_variant_snapshot_option_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Generate path parameter IDs
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Prepare request body with pagination
  const body = {
    page: 1,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommercePlatformSnapshotVariantOption.IRequest;
  // 4. Call the snapshot variant options index endpoint
  const pageResult =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
        body,
      },
    );
  typia.assert(pageResult);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", pageResult.pagination.current, 1);
  TestValidator.predicate(
    "limit matches requested value",
    pageResult.pagination.limit === body.limit,
  );
  TestValidator.predicate(
    "records count is non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    pageResult.pagination.pages >= 0,
  );
  // 6. Validate option records if any returned
  if (pageResult.data.length > 0) {
    const firstOption = pageResult.data[0]!;
    // Validate option structure
    TestValidator.predicate("option has valid key", firstOption.key.length > 0);
    TestValidator.predicate(
      "option has valid value",
      firstOption.value.length > 0,
    );
    TestValidator.predicate(
      "option has snapshot variant reference",
      firstOption.snapshotVariant.id.length > 0,
    );
    // Validate snapshot variant reference structure
    TestValidator.predicate(
      "snapshot variant has SKU code",
      firstOption.snapshotVariant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "snapshot variant has price",
      typeof firstOption.snapshotVariant.price === "number",
    );
    TestValidator.predicate(
      "snapshot variant stock quantity is non-negative",
      firstOption.snapshotVariant.stock_quantity >= 0,
    );
    // Validate ordering: if multiple options, check key ordering
    if (pageResult.data.length > 1) {
      for (let i = 1; i < pageResult.data.length; i++) {
        const prev = pageResult.data[i - 1]!;
        const curr = pageResult.data[i]!;
        TestValidator.predicate(
          `option[${i}] key >= option[${i - 1}] key`,
          curr.key >= prev.key,
        );
      }
    }
  }
}
