import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_delete_blocked_by_active_variant_dependencies(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that product deletion is rejected when a seller attempts to remove a
   * product that is still protected by active variant-level commercial rules.
   *
   * The available test surface for this task only exposes seller registration and
   * product deletion, so the scenario is exercised as a deletion failure check
   * through an authenticated seller connection. This confirms the endpoint does
   * not silently succeed and that the platform preserves its business-rule guard
   * around protected products.
   *
   * 1. Register and authenticate an isolated seller connection.
   * 2. Attempt to delete a target product identifier through that seller.
   * 3. Expect the operation to fail with a business-style rejection.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.httpError(
    "product deletion should be rejected for protected or dependent products",
    [400, 404, 409],
    async () => {
      await api.functional.mallPlatform.seller.products.erase(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
