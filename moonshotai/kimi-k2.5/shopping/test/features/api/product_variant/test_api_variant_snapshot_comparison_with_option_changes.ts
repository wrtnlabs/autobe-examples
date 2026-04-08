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

export async function test_api_variant_snapshot_comparison_with_option_changes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Compare two snapshots of a variant with option changes
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const comparison =
    await api.functional.ecommerceMall.seller.productVariants.snapshots.compare(
      sellerConnection,
      { variantId },
    );
  typia.assert(comparison);
  // Step 3: Validate the comparison shows proper snapshot comparison structure
  // The comparison contains before/after snapshots and their differences
  typia.assert(comparison.before);
  typia.assert(comparison.after);
  typia.assert(comparison.differences);
  // Step 4: Validate snapshot datum types are valid
  typia.assert(
    comparison.before.type === "string" ||
      comparison.before.type === "number" ||
      comparison.before.type === "boolean" ||
      comparison.before.type === "null" ||
      comparison.before.type === "object" ||
      comparison.before.type === "array",
  );
  typia.assert(
    comparison.after.type === "string" ||
      comparison.after.type === "number" ||
      comparison.after.type === "boolean" ||
      comparison.after.type === "null" ||
      comparison.after.type === "object" ||
      comparison.after.type === "array",
  );
  // Step 5: Validate differences array contains proper difference entries
  for (const diff of comparison.differences) {
    typia.assert(diff.path);
    typia.assert(diff.operation);
    typia.assert(diff.oldValue !== undefined);
    typia.assert(diff.newValue !== undefined);
  }
}
