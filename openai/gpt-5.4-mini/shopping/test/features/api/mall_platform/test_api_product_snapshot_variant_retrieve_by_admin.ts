import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variant_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.products.snapshots.variants.at(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert<IMallPlatformProductSnapshotVariant>(response);
  TestValidator.predicate(
    "variant id is a uuid string",
    response.id.length > 0,
  );
  TestValidator.predicate(
    "variant sku code exists",
    response.skuCode.length > 0,
  );
  TestValidator.predicate(
    "variant option values exist",
    response.optionValues.length > 0,
  );
  TestValidator.predicate(
    "snapshot id exists",
    response.productSnapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot product name exists",
    response.productSnapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot product description exists",
    response.productSnapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "variant created at exists",
    response.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot created at exists",
    response.productSnapshot.createdAt.length > 0,
  );
}
