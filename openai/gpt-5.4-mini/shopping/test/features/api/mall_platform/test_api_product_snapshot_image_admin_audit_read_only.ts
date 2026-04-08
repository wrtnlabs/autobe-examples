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

export async function test_api_product_snapshot_image_admin_audit_read_only(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator audit access to a preserved product snapshot image.
   *
   * This scenario validates that administrators can read immutable product image
   * history for dispute review without mutating any catalog data. It authenticates
   * an administrator session, fetches a preserved snapshot image record by
   * snapshot and image identifiers, and confirms the returned audit payload is
   * well-formed and self-consistent.
   *
   * 1. Authenticate an administrator using an isolated connection.
   * 2. Request a preserved product snapshot image record by snapshot/image UUIDs.
   * 3. Validate the returned snapshot image payload and linked snapshot summary.
   * 4. Confirm the read result is internally consistent and exposes immutable
   *    preserved data only.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorBody = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IMallPlatformAdministrator.IJoin;
  await authorize_administrator_join(administratorConnection, {
    body: administratorBody,
  });
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const productSnapshotImageId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.productSnapshots.images.getByProductsnapshotidAndProductsnapshotimageid(
      administratorConnection,
      {
        productSnapshotId,
        productSnapshotImageId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot image id preserved",
    output.id,
    productSnapshotImageId,
  );
  TestValidator.equals(
    "snapshot id preserved",
    output.productSnapshot.id,
    productSnapshotId,
  );
  TestValidator.predicate(
    "snapshot image has image uri",
    output.imageUri.length > 0,
  );
  TestValidator.predicate(
    "snapshot image sort order is non-negative",
    output.sortOrder >= 0,
  );
  TestValidator.predicate(
    "snapshot image createdAt is valid",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "linked snapshot product exists",
    output.productSnapshot.product.id.length > 0,
  );
  TestValidator.predicate(
    "linked snapshot product name preserved",
    output.productSnapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "linked snapshot base price is non-negative",
    output.productSnapshot.basePrice >= 0,
  );
  TestValidator.predicate(
    "linked snapshot image count is non-negative",
    output.productSnapshot.imageCount >= 0,
  );
  TestValidator.predicate(
    "linked snapshot variant count is non-negative",
    output.productSnapshot.variantCount >= 0,
  );
}
