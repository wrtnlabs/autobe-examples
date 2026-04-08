import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
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
 * Retrieve a preserved option entry from a product variant snapshot.
 *
 * This test validates that an administrator can read an immutable option record
 * from a variant snapshot using the correct product, variant, snapshot, and
 * option-key hierarchy. It ensures the response preserves the historical option
 * key and option value exactly as captured and that the returned parent snapshot
 * reference matches the requested snapshot scope.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Request a preserved product variant snapshot option by product, variant,
 *    snapshot, and option key identifiers.
 * 3. Validate the returned immutable option row and confirm its snapshot
 *    reference and stored option value are consistent with the requested scope.
 */
export async function test_api_product_variant_snapshot_option_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionKey = RandomGenerator.alphabets(12);
  const output =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.options.at(
      administratorConnection,
      {
        productId,
        variantId,
        snapshotId,
        optionKey,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "option key should match the requested hierarchy key",
    output.optionKey,
    optionKey,
  );
  TestValidator.equals(
    "parent snapshot id should match the requested snapshot",
    output.productVariantSnapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "parent snapshot should preserve the same variant id",
    output.productVariantSnapshot.productVariant.id,
    variantId,
  );
  TestValidator.equals(
    "parent snapshot should preserve the same product id",
    output.productVariantSnapshot.product.id,
    productId,
  );
  TestValidator.predicate(
    "captured option value should not be empty",
    output.optionValue.length > 0,
  );
}
