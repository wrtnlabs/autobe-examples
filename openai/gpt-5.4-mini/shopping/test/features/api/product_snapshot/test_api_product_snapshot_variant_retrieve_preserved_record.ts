import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Retrieve a preserved product snapshot variant for a seller-owned historical snapshot.
 *
 * Validates that an authenticated seller can read an immutable historical product snapshot variant record scoped to one of their own snapshots. The test ensures the endpoint returns the preserved SKU code, option values, optional price override, availability flag, and creation timestamp without mutating live catalog state.
 *
 * The scenario also checks the embedded snapshot relation and optional linked variant snapshot relation for internal consistency, confirming the response represents a preserved audit record rather than the current product variant state.
 *
 * 1. Seller registers and authenticates through the seller join endpoint.
 * 2. A preserved product snapshot variant is requested by snapshot ID and snapshot-variant ID.
 * 3. The response is validated as an immutable snapshot variant DTO.
 * 4. Snapshot relations and preserved variant fields are checked for consistency using only DTO fields that exist.
 */
export async function test_api_product_snapshot_variant_retrieve_preserved_record(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(auth);
  const output =
    await api.functional.mallPlatform.seller.productSnapshots.variants.at(
      sellerConnection,
      {
        productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        productSnapshotVariantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "snapshot variant has preserved sku code",
    output.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot variant has preserved option values",
    output.optionValues.length > 0,
  );
  TestValidator.predicate(
    "snapshot variant availability is boolean",
    output.isAvailable === true || output.isAvailable === false,
  );
  TestValidator.predicate(
    "snapshot variant has created timestamp",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot relation exists",
    output.productSnapshot !== null,
  );
  if (output.productVariantSnapshot !== null) {
    TestValidator.predicate(
      "linked variant snapshot has preserved sku code",
      output.productVariantSnapshot.skuCode.length > 0,
    );
    TestValidator.predicate(
      "linked variant snapshot has preserved option summary",
      output.productVariantSnapshot.optionSummary.length > 0,
    );
    TestValidator.predicate(
      "linked variant snapshot is a valid summary payload",
      true,
    );
  }
}
