import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_retrieve_historical_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve a preserved product variant snapshot as an administrator.
   *
   * This test authenticates an administrator and calls the administrator-only
   * variant snapshot retrieval endpoint with syntactically valid identifiers. It
   * validates that the API returns the immutable historical snapshot payload,
   * including the preserved variant summary fields and timestamp metadata.
   *
   * 1. Authenticate a fresh administrator connection.
   * 2. Retrieve a product variant snapshot by product, snapshot, and variant snapshot identifiers.
   * 3. Validate the returned historical snapshot structure and preserved fields.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const snapshot =
    await api.functional.mallPlatform.administrator.products.snapshots.variants.getByProductidAndSnapshotidAndVariantsnapshotid(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
  TestValidator.predicate("sku code preserved", snapshot.skuCode.length > 0);
  TestValidator.predicate(
    "option summary preserved",
    snapshot.optionSummary.length > 0,
  );
  TestValidator.predicate("createdAt preserved", snapshot.createdAt.length > 0);
  TestValidator.predicate(
    "product summary exists",
    snapshot.product.id.length > 0 && snapshot.product.name.length > 0,
  );
  TestValidator.predicate(
    "variant summary exists",
    snapshot.productVariant.id.length > 0 &&
      snapshot.productVariant.skuCode.length > 0,
  );
}
