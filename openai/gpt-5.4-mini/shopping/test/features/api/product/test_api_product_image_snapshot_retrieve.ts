import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_image_snapshot_retrieve(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve a preserved historical product image snapshot for administrator review.
   *
   * Verifies that the administrator-only image snapshot endpoint returns an immutable
   * historical record for a product image. The test focuses on the snapshot payload
   * shape, timestamp fields, and the linkage between the snapshot and its parent product.
   *
   * Because only the read endpoint and administrator authentication utility are
   * available in the provided test context, this scenario validates the returned
   * snapshot contract directly for a matching product and snapshot identifier pair.
   *
   * 1. Authenticate a dedicated administrator connection.
   * 2. Request a product image snapshot by product and snapshot identifier.
   * 3. Validate the immutable snapshot response payload.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.products.imageSnapshots.at(
      administratorConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot has an id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot has a parent product",
    snapshot.product.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot image url is present",
    snapshot.imageUrl.length > 0,
  );
  TestValidator.predicate(
    "snapshot image order is non-negative",
    snapshot.imageOrder >= 0,
  );
  TestValidator.predicate(
    "snapshot has a main-image flag",
    snapshot.isMain === true || snapshot.isMain === false,
  );
  TestValidator.predicate(
    "snapshot has a change timestamp",
    snapshot.changedAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot has update timestamp",
    snapshot.updatedAt.length > 0,
  );
  TestValidator.equals(
    "snapshot is preserved and not deleted",
    snapshot.deletedAt,
    null,
  );
}
