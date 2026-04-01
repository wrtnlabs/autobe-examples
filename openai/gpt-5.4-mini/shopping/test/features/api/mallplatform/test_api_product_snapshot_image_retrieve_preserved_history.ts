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

export async function test_api_product_snapshot_image_retrieve_preserved_history(
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
  const imageId = typia.random<string & tags.Format<"uuid">>();
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
  TestValidator.equals("preserved image id", output.id, imageId);
  TestValidator.predicate(
    "preserved image URI exists",
    output.imageUri.length > 0,
  );
  TestValidator.equals(
    "preserved image sort order is zero-based",
    output.sortOrder,
    0,
  );
  TestValidator.equals(
    "parent snapshot id",
    output.productSnapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "parent snapshot kind exists",
    output.productSnapshot.snapshotKind.length > 0,
  );
  TestValidator.predicate(
    "parent snapshot product name exists",
    output.productSnapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "parent snapshot product description exists",
    output.productSnapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "parent snapshot createdAt is present",
    output.productSnapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot image createdAt is present",
    output.createdAt.length > 0,
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "administrator authorization is required",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.images.at(
        unauthorizedConnection,
        {
          productId,
          snapshotId,
          imageId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "snapshot scoping rejects mismatched product id",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.images.at(
        adminConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId,
          imageId,
        },
      );
    },
  );
}
