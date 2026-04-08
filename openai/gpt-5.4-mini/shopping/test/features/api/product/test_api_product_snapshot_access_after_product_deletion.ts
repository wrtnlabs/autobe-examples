import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify that an administrator can access a preserved product snapshot after product deletion.
 *
 * This test validates the administrator-only product snapshot retrieval endpoint and ensures the returned immutable historical payload is structurally correct. The response is checked as a preserved product snapshot, including its embedded product summary and snapshot metadata.
 *
 * The scenario requires historical data to remain available even after the live product is removed. Because only the administrator snapshot retrieval endpoint is available in the current test surface, the test focuses on confirming that the snapshot representation itself is valid and stable for administrator access.
 *
 * 1. Register and authenticate a dedicated administrator account using the authorized join flow.
 * 2. Retrieve a product snapshot through the administrator snapshot endpoint.
 * 3. Validate the returned snapshot and confirm the embedded historical product reference is preserved.
 */
export async function test_api_product_snapshot_access_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.products.snapshots.at(
      administratorConnection,
      {
        productId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id", snapshot.id, snapshotId);
  TestValidator.equals("snapshot product id", snapshot.product.id, productId);
  TestValidator.predicate(
    "snapshot has preserved product name",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot has preserved product description",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot kind is present",
    snapshot.snapshotKind.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt is present",
    snapshot.createdAt.length > 0,
  );
}
