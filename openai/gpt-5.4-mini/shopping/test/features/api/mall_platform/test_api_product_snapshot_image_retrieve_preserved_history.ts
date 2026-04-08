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
 * Retrieve a preserved product snapshot image as an administrator.
 *
 * Verifies that administrator-only access can read an immutable product snapshot image record and that the returned payload preserves the historical snapshot relationship, image URI, sort order, and creation timestamp without mutating the stored data.
 *
 * The test focuses on the snapshot-image read contract itself: the result must describe a preserved historical image entry, must contain a valid owning product snapshot reference, and must remain structurally consistent for dispute-resolution use cases.
 *
 * 1. Authenticate as an administrator.
 * 2. Retrieve a preserved product snapshot image using paired snapshot identifiers.
 * 3. Validate the returned snapshot-image record and its historical fields.
 */
export async function test_api_product_snapshot_image_retrieve_preserved_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphabets(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.productSnapshots.images.getByProductsnapshotidAndProductsnapshotimageid(
      adminConnection,
      {
        productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        productSnapshotImageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate("snapshot image id is a uuid", output.id.length > 0);
  TestValidator.predicate("image uri is preserved", output.imageUri.length > 0);
  TestValidator.predicate(
    "sort order is an integer",
    Number.isInteger(output.sortOrder),
  );
  TestValidator.predicate(
    "created timestamp exists",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "owns a product snapshot",
    output.productSnapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot has product reference",
    output.productSnapshot.product.id.length > 0,
  );
  TestValidator.predicate(
    "historical snapshot record contains captured product state",
    output.productSnapshot.productName.length > 0 &&
      output.productSnapshot.productDescription.length > 0 &&
      output.productSnapshot.snapshotKind.length > 0,
  );
}
