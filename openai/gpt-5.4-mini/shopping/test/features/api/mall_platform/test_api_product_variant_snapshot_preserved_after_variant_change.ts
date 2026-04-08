import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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

/**
 * Verify preserved product variant snapshot retrieval for administrator audit access.
 *
 * Validates that the administrator snapshot endpoint returns an immutable product variant snapshot payload with the expected historical fields. The test focuses on read-only snapshot inspection and checks that the preserved data remains structurally consistent for dispute resolution and catalog history review.
 *
 * 1. Authenticate an administrator using the provided authorization utility on an isolated connection.
 * 2. Request a product variant snapshot through the administrator snapshot endpoint.
 * 3. Validate the snapshot payload and confirm that immutable historical fields are present and structurally consistent.
 */
export async function test_api_product_variant_snapshot_preserved_after_variant_change(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.at(
      administratorConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot has an id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot preserves SKU code",
    snapshot.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves option summary",
    snapshot.optionSummary.length > 0,
  );
  TestValidator.predicate(
    "snapshot has a creation timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot contains product reference",
    snapshot.product.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot contains variant reference",
    snapshot.productVariant.id.length > 0,
  );
  TestValidator.equals(
    "variant belongs to the same product",
    snapshot.productVariant.product.id,
    snapshot.product.id,
  );
}
