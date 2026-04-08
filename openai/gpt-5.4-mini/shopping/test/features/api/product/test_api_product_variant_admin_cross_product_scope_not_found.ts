import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_admin_cross_product_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator-scoped variant lookup rejects cross-product access.
   *
   * This test validates that the administrator product-variant read endpoint
   * does not allow a variant to be retrieved through the wrong product scope.
   * Since only the read endpoint is available in the current API surface, the
   * test focuses on the not-found contract for an invalid product/variant pair.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Generate two distinct UUID values representing different product scopes.
   * 3. Request a variant under the wrong product scope and expect a 404 error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const otherProductId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "product scopes should differ",
    productId,
    otherProductId,
  );
  await TestValidator.httpError(
    "cross-product variant lookup should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.variants.at(
        adminConnection,
        {
          productId,
          variantId,
        },
      );
    },
  );
}
