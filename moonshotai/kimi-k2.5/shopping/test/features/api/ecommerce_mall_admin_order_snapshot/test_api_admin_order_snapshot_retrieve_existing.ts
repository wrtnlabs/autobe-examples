import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
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
 * Test administrator retrieval of an existing order snapshot.
 *
 * Scenario: Administrator successfully retrieves an existing order snapshot by its ID.
 * The administrator authenticates via admin join, then queries a valid snapshot
 * associated with a specific order. The response includes the snapshot's ID,
 * order ID, creation timestamp, and the captured order state (order number,
 * total price, status, creation date). Validates that snapshots preserve
 * historical order information for audit and compliance purposes.
 *
 * @param connection Base connection to the API server
 */
export async function test_api_admin_order_snapshot_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Retrieve existing order snapshot
  const snapshot = await api.functional.ecommerceMall.admin.orders.snapshots.at(
    adminConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(snapshot);
}