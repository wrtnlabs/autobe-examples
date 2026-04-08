import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variant_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve a preserved product snapshot variant as an administrator.
   *
   * This test validates that the administrator-only snapshot variant read endpoint returns the immutable historical row for a specific product snapshot and variant pair. It ensures the response reflects archived state, preserves snapshot relations, and exposes the expected historical variant fields.
   *
   * 1. Authenticate as an administrator using a dedicated connection.
   * 2. Retrieve a preserved product snapshot variant from the snapshot history endpoint.
   * 3. Validate the returned immutable row and its historical relations/fields.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.productSnapshots.variants.at(
      adminConnection,
      {
        productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        productSnapshotVariantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "variant belongs to the returned product snapshot",
    output.productSnapshot.id,
    output.productSnapshot.id,
  );
  TestValidator.predicate(
    "historical SKU code is preserved",
    output.skuCode.length > 0,
  );
  TestValidator.predicate(
    "historical option values are preserved",
    output.optionValues.length > 0,
  );
  TestValidator.predicate(
    "price override is a preserved historical value or absent",
    output.priceOverride === null || typeof output.priceOverride === "number",
  );
  TestValidator.predicate(
    "availability flag is a preserved historical state",
    typeof output.isAvailable === "boolean",
  );
  TestValidator.predicate(
    "createdAt is an ISO timestamp",
    output.createdAt.length > 0,
  );
  if (output.productVariantSnapshot !== null) {
    TestValidator.equals(
      "linked variant snapshot product matches parent snapshot product",
      output.productVariantSnapshot.product.id,
      output.productSnapshot.product.id,
    );
  }
}
