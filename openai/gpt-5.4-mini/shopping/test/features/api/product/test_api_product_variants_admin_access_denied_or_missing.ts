import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator product variant listing rejects missing and unauthorized targets.
 *
 * Validates that the administrator-only variant listing endpoint enforces resource existence and access control.
 * This covers two business-error cases: a missing product identifier should produce a not-found failure, and a caller without administrator authorization should produce a forbidden failure.
 *
 * 1. Authenticate an administrator using the join utility and prepare an administrator-scoped connection.
 * 2. Call the endpoint with a missing product ID and expect a not-found error.
 * 3. Call the endpoint with a base connection that has no administrator authorization and expect a forbidden error.
 */
export async function test_api_product_variants_admin_access_denied_or_missing(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const missingProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing product should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.products.variants.index(
        administratorConnection,
        {
          productId: missingProductId,
          body: {} satisfies IMallPlatformProductVariant.IRequest,
        },
      );
    },
  );
  const forbiddenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access should return forbidden",
    [403],
    async () => {
      await api.functional.mallPlatform.administrator.products.variants.index(
        forbiddenConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IMallPlatformProductVariant.IRequest,
        },
      );
    },
  );
}
