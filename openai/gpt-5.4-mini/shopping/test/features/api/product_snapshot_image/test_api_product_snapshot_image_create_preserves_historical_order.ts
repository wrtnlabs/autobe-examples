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
import { generate_random_mall_platform_administrator_product_snapshots_images_create } from "../../../generate/generate_random_mall_platform_administrator_product_snapshots_images_create";
import { prepare_random_mall_platform_product_snapshot_image } from "../../../prepare/prepare_random_mall_platform_product_snapshot_image";

export async function test_api_product_snapshot_image_create_preserves_historical_order(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator-created product snapshot image archival preserves historical image order.
   *
   * Verifies that a product snapshot image row can be created by an authenticated administrator,
   * and that the returned immutable snapshot image preserves the requested image URI and sort order
   * exactly as provided for historical rendering and dispute review purposes.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Create a product snapshot image row for a valid snapshot identifier.
   * 3. Validate the created snapshot image response preserves the historical URI, sort order, and relation.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "Aa1!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const imageUri = `historical/${RandomGenerator.alphaNumeric(12)}.jpg`;
  const sortOrder = 0 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const output =
    await generate_random_mall_platform_administrator_product_snapshots_images_create(
      administratorConnection,
      {
        params: { productSnapshotId },
        body: {
          imageUri,
          sortOrder,
        } satisfies IMallPlatformProductSnapshotImage.ICreate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot id preserved",
    output.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.equals("image uri preserved", output.imageUri, imageUri);
  TestValidator.equals("sort order preserved", output.sortOrder, sortOrder);
  TestValidator.predicate(
    "response is tied to the requested snapshot",
    output.productSnapshot.id === productSnapshotId,
  );
}
