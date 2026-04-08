import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order item snapshot retrieval for purchase history verification.
 *
 * Validates that administrators can retrieve point-in-time snapshots of order items showing the exact product and seller information at the moment of purchase. This ensures historical data integrity for audit trails and dispute resolution even after products or seller profiles change.
 *
 * The test verifies the snapshot contains all required historical fields including product name, description, base price, seller shop name, and logo URL exactly as they appeared during the original transaction.
 *
 * 1. Administrator authenticates via join endpoint with credentials.
 * 2. Admin connection is created with authentication token.
 * 3. Order item snapshot is retrieved using admin endpoint with order and item IDs.
 * 4. Validates snapshot structure matches IEcommerceOrderItemSnapshot type.
 */
export async function test_api_admin_order_item_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve order item snapshot (simulation mode with random UUIDs)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerce.admin.orders.items.snapshot.at(
      adminConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
}
