import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
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
 * Verify product snapshot images cannot be fetched outside their parent snapshot scope.
 *
 * This test authenticates an administrator session and then calls the preserved
 * product snapshot image endpoint with a snapshot/image identifier combination
 * that is intentionally outside the correct parent-child relationship.
 *
 * The scenario protects the snapshot history contract by ensuring preserved
 * images remain read-only and only accessible through the exact snapshot they
 * belong to. It focuses on the not-found behavior that should occur when an
 * image identifier does not belong to the requested snapshot.
 *
 * 1. Authenticate as an administrator using the dedicated join utility.
 * 2. Request a product snapshot image with mismatched snapshot and image IDs.
 * 3. Assert that the endpoint responds with not found.
 */
export async function test_api_product_snapshot_image_not_found_outside_snapshot_scope(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const productSnapshotImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "product snapshot image should not be accessible outside its parent snapshot scope",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.productSnapshots.images.getByProductsnapshotidAndProductsnapshotimageid(
        administratorConnection,
        {
          productSnapshotId,
          productSnapshotImageId,
        },
      );
    },
  );
}
