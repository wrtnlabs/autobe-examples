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

export async function test_api_product_variant_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve and validate a product variant snapshot as an immutable historical record.
   *
   * This test authenticates an administrator, retrieves a product variant snapshot,
   * and verifies that the returned payload preserves the expected snapshot shape
   * and parent references without mutating current state.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Retrieve the product variant snapshot through the administrator snapshot endpoint.
   * 3. Validate the immutable snapshot payload and its preserved product/variant references.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.at(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should match request",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "product reference should be preserved",
    snapshot.product.id,
    productId,
  );
  TestValidator.equals(
    "variant reference should be preserved",
    snapshot.productVariant.id,
    variantId,
  );
  TestValidator.equals(
    "snapshot product reference should align with product summary",
    snapshot.product,
    snapshot.product,
  );
  TestValidator.equals(
    "snapshot variant product reference should align with snapshot product",
    snapshot.productVariant.product.id,
    snapshot.product.id,
  );
  TestValidator.predicate(
    "snapshot createdAt should exist",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshotReason is either preserved text or null",
    snapshot.snapshotReason === null || snapshot.snapshotReason.length >= 0,
  );
  TestValidator.predicate(
    "snapshot preserves historical variant SKU information",
    snapshot.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves historical option summary",
    snapshot.optionSummary.length > 0,
  );
}
