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

export async function test_api_product_image_snapshot_retrieve_for_administrator(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.products._imageSnapshots.at(
      administratorConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot has an owning product",
    snapshot.product.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot has image url",
    snapshot.imageUrl.length > 0,
  );
  TestValidator.predicate(
    "snapshot has non-negative image order",
    snapshot.imageOrder >= 0,
  );
  TestValidator.predicate(
    "snapshot has main-image flag",
    typeof snapshot.isMain === "boolean",
  );
  TestValidator.predicate(
    "snapshot has changedAt timestamp",
    snapshot.changedAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot has createdAt timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot has updatedAt timestamp",
    snapshot.updatedAt.length > 0,
  );
  TestValidator.equals(
    "snapshot is not soft-deleted",
    snapshot.deletedAt,
    null,
  );
}
