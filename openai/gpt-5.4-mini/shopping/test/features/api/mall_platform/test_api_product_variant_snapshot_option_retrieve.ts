import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_option_retrieve(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve a product variant snapshot option as an administrator.
   *
   * This test verifies that the administrator-only endpoint can be invoked with
   * valid UUID-shaped identifiers and that the response conforms to the preserved
   * option-row schema. It focuses on the read-only response shape because the
   * available test surface does not provide fixture builders for creating a fully
   * linked product, snapshot, and option chain.
   *
   * 1. Authenticate an administrator using an isolated connection.
   * 2. Call the snapshot option retrieval endpoint with UUID-shaped identifiers.
   * 3. Validate the returned preserved option row and nested snapshot reference.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.options.at(
      adminConnection,
      {
        productId,
        snapshotId,
        optionId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "option id should match the requested identifier",
    output.id,
    optionId,
  );
  TestValidator.equals(
    "snapshot reference should preserve the requested snapshot identifier",
    output.productVariantSnapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "option key should be a non-empty string",
    output.optionKey.length > 0,
  );
  TestValidator.predicate(
    "option value should be a non-empty string",
    output.optionValue.length > 0,
  );
  TestValidator.predicate(
    "snapshot should resolve to a product reference",
    output.productVariantSnapshot.product.id.length > 0,
  );
}
