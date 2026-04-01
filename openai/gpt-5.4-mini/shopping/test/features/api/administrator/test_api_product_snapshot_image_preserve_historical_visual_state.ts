import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_image_preserve_historical_visual_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator access to a preserved product snapshot image record.
   *
   * This test authenticates as an administrator and requests a historical
   * product snapshot image through the administrator-only endpoint. The response
   * must represent an immutable snapshot image structure, including preserved
   * image URI, display order, parent snapshot reference, and creation time.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const imageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const output =
    await api.functional.mallPlatform.administrator.products.snapshots.images.at(
      adminConnection,
      {
        productId,
        snapshotId,
        imageId,
      },
    );
  typia.assert(output);
  TestValidator.equals("snapshot image id preserved", output.id, imageId);
  TestValidator.predicate(
    "snapshot image URI preserved",
    output.imageUri.length > 0,
  );
  TestValidator.equals(
    "snapshot parent reference preserved",
    output.productSnapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "snapshot created timestamp exists",
    output.createdAt.length > 0,
  );
}
