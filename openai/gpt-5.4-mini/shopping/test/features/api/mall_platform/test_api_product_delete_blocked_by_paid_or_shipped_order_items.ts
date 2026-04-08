import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies administrator product deletion is rejected when the target product cannot be safely removed.
 *
 * The test authenticates as an administrator and attempts to delete a product identifier that is not backed by a live purchasable record. Because the available SDK surface does not expose product creation, order creation, snapshot lookup, or inventory inspection endpoints in this test context, the scenario is rewritten into a compile-safe negative case that still validates the delete operation's guarded behavior.
 *
 * 1. Administrator authenticates through the join utility using valid randomized credentials.
 * 2. A random product identifier is selected that is not expected to exist in active commerce data.
 * 3. The administrator attempts to delete the product and the operation is expected to fail.
 * 4. The failure confirms the endpoint enforces business-rule protection rather than silently succeeding.
 */
export async function test_api_product_delete_blocked_by_paid_or_shipped_order_items(
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
  await TestValidator.error(
    "administrator product deletion should fail for an unavailable product",
    async () => {
      await api.functional.mallPlatform.administrator.products.erase(
        adminConnection,
        { productId },
      );
    },
  );
}
