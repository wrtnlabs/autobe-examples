import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_option_cross_product_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Ensures administrator snapshot option lookups remain scoped to the requested product.
   *
   * This test validates the read boundary on preserved product variant snapshot options.
   * It authenticates an administrator, then attempts to read a snapshot option using a
   * product identifier and historical identifiers that are not expected to resolve as a
   * valid product/snapshot/option combination. The endpoint must reject the request with
   * a not found response rather than exposing unrelated preserved option data.
   *
   * 1. Register an administrator and create an authenticated admin connection.
   * 2. Call the snapshot option lookup with identifiers that do not form a valid scope.
   * 3. Assert the request fails with a not found response.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-product snapshot option lookup should be not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.variantSnapshots.options.at(
        adminConnection,
        {
          productId,
          snapshotId,
          optionId,
        },
      );
    },
  );
}
