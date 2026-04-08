import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Rejects administrator image snapshot history lookup for a missing product.
 *
 * Validates that the administrator-only product image snapshot history endpoint
 * does not return an empty page for a non-existent product identifier.
 * Instead, it must fail with a not-found style error because the parent
 * product resource does not exist.
 *
 * 1. Authenticate as an administrator using the supported join utility.
 * 2. Request image snapshot history for a random product UUID that does not exist.
 * 3. Verify that the endpoint rejects the request with a not-found error.
 */
export async function test_api_product_image_snapshot_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "administrator product image snapshot history should reject missing product",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.products.imageSnapshots.index(
        adminConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IMallPlatformProductImageSnapshot.IRequest,
        },
      );
    },
  );
}
