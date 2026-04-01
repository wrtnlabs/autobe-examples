import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variant_preserved_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await api.functional.mallPlatform.administrator.products.snapshots.variants.at(
      adminConnection,
      {
        productId,
        snapshotId,
        variantId,
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "snapshot variant belongs to requested snapshot",
    variant.productSnapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "snapshot kind is preserved",
    variant.productSnapshot.snapshotKind.length > 0,
  );
  TestValidator.predicate(
    "snapshot product name is preserved",
    variant.productSnapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot product description is preserved",
    variant.productSnapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot base price is valid",
    variant.productSnapshot.basePrice >= 0,
  );
  TestValidator.predicate(
    "snapshot image count is valid",
    variant.productSnapshot.imageCount >= 0,
  );
  TestValidator.predicate(
    "snapshot variant count is valid",
    variant.productSnapshot.variantCount >= 1,
  );
  TestValidator.predicate(
    "snapshot createdAt is present",
    variant.productSnapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "variant sku code is preserved",
    variant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "variant option values are preserved",
    variant.optionValues.length > 0,
  );
  TestValidator.predicate(
    "variant createdAt is present",
    variant.createdAt.length > 0,
  );
}
