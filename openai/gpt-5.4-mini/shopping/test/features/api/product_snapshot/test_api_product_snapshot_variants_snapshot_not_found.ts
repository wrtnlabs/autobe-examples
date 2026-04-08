import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variants_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that an administrator receives a not-found error when requesting
   * preserved variants for a non-existent product snapshot.
   *
   * This test validates the historical snapshot lookup flow and ensures the
   * server checks the parent product snapshot before attempting to return any
   * child variant rows. It confirms that invalid snapshot identifiers do not
   * produce an empty success page or an unexpected generic response.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request preserved variants for a randomly generated non-existent snapshot identifier.
   * 3. Assert that the endpoint rejects the request with a not-found HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!abcd",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "product snapshot variants not found",
    404,
    async () => {
      const response =
        await api.functional.mallPlatform.administrator.productSnapshots.variants.index(
          adminConnection,
          {
            productSnapshotId,
            body: {} satisfies IMallPlatformProductSnapshotVariant.IRequest,
          },
        );
      typia.assert(response);
    },
  );
}
