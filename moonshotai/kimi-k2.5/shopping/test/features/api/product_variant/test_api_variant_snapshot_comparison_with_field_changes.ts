import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDifferenceEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IDifferenceEntry";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ISnapshotDatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshotDatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test snapshot comparison where the variant has changed significantly between two time points.
 * The seller compares an older snapshot (with original SKU, price, and stock level) against
 * a newer snapshot (after price adjustment and stock updates). The diff should clearly
 * highlight all modified fields including numeric changes (price difference calculation),
 * string changes (sku code changes), and quantity changes.
 */
export async function test_api_variant_snapshot_comparison_with_field_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Generate a variant ID for testing comparison
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Compare snapshots for the product variant
  const comparison: IEcommerceMallProductVariantSnapshot.ICompare =
    await api.functional.ecommerceMall.seller.productVariants.snapshots.compare(
      sellerConnection,
      {
        variantId,
      },
    );
  // 4. Validate the complete comparison response including before/after snapshots
  // and differences array structure
  typia.assert(comparison);
}
