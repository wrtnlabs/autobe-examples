import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refund_request_snapshot_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates via admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate UUIDs for the refund request snapshot path chain
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves the refund request snapshot
  const snapshot =
    await api.functional.ecommerce.admin.orders.items.refund_requests.snapshots.at(
      adminConnection,
      {
        orderId,
        itemId,
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains all required fields
  TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot has ecommerce_refund_request_id",
    snapshot.ecommerce_refund_request_id.length > 0,
  );
  TestValidator.predicate("snapshot has reason", snapshot.reason.length > 0);
  TestValidator.predicate("snapshot has status", snapshot.status.length > 0);
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at.length > 0,
  );
  // 5. Validate approved status snapshot has seller response and response_at
  TestValidator.predicate("status is approved", snapshot.status === "approved");
  TestValidator.predicate(
    "seller_response is not null for approved status",
    snapshot.seller_response !== null &&
      snapshot.seller_response !== undefined &&
      snapshot.seller_response.length > 0,
  );
  TestValidator.predicate(
    "response_at is not null for approved status",
    snapshot.response_at !== null &&
      snapshot.response_at !== undefined &&
      snapshot.response_at.length > 0,
  );
}
