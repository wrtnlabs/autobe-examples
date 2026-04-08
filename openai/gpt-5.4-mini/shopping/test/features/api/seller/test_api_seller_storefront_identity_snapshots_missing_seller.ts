import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies that storefront identity snapshot history is not exposed for a missing seller account.
 *
 * This test authenticates an administrator and then requests seller storefront identity snapshot history
 * using a valid UUID that does not correspond to any seller record. It ensures the endpoint rejects the
 * lookup with a not-found error instead of returning an empty page or unrelated snapshot history.
 *
 * 1. Authenticate an administrator using the dedicated join utility.
 * 2. Request storefront identity snapshots for a non-existent seller identifier.
 * 3. Assert the endpoint responds with not found and does not expose unrelated history.
 */
export async function test_api_seller_storefront_identity_snapshots_missing_seller(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const missingSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "missing seller storefront identity snapshots should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.sellers.storefront_identity.snapshots.index(
        administratorConnection,
        {
          sellerId: missingSellerId,
          body: {} satisfies IMallPlatformSellerProfileSnapshot.IRequest,
        },
      );
    },
  );
}
