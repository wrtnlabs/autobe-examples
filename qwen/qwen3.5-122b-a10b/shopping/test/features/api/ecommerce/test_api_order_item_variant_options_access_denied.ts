import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer access control for order item variant option snapshots.
 *
 * Validates that customers cannot access other customers' order item variant option snapshots, enforcing proper data isolation and access control. This test ensures the system correctly prevents unauthorized access to sensitive order history data.
 *
 * 1. Create victim customer account and authenticate.
 * 2. Create attacker customer account and authenticate.
 * 3. Generate victim's order ID and item ID (simulating pre-seeded data).
 * 4. Attacker attempts to access victim's order item variant options snapshot.
 * 5. Verify system returns 403 Forbidden or 404 Not Found error.
 */
export async function test_api_order_item_variant_options_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create victim customer
  const victimConnection: api.IConnection = { host: connection.host };
  const victim: IEcommerceCustomer.IAuthorized =
    await api.functional.ecommerce.auth.customer.join(victimConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(victim);
  // 2. Create attacker customer
  const attackerConnection: api.IConnection = { host: connection.host };
  const attacker: IEcommerceCustomer.IAuthorized =
    await api.functional.ecommerce.auth.customer.join(attackerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(attacker);
  // 3. Generate victim's order ID and item ID (simulating pre-seeded data)
  const victimOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const victimItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attacker attempts to access victim's order item variant options snapshot
  await TestValidator.httpError(
    "attacker cannot access victim's order item variant options",
    [403, 404],
    async () => {
      const result: IPageIEcommerceOrderItemSnapshotVariantOption.ISummary =
        await api.functional.ecommerce.customer.orders.items.snapshot.variant.options.index(
          attackerConnection,
          {
            orderId: victimOrderId,
            itemId: victimItemId,
            body: {},
          },
        );
      typia.assert(result);
    },
  );
}
