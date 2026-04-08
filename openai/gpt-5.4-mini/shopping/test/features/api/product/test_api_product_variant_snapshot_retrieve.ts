import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const beforeProductReference = productId;
  const beforeSnapshotReference = snapshotId;
  const snapshot =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.at(
      adminConnection,
      {
        productId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id matches route id", snapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot parent product id matches requested product",
    snapshot.product.id,
    productId,
  );
  TestValidator.equals(
    "product id reference preserved",
    productId,
    beforeProductReference,
  );
  TestValidator.equals(
    "snapshot id reference preserved",
    snapshotId,
    beforeSnapshotReference,
  );
}
