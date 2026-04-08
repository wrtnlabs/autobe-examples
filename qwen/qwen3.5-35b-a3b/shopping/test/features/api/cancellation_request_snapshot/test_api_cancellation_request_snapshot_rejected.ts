import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResponse);
  // 2. Create admin connection with token
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminResponse.token.access },
  };
  // 3. Retrieve rejection snapshot (use random UUID - assume test DB has pre-populated data)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.at(
      adminAuthenticatedConnection,
      { id: snapshotId },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and rejection state
  TestValidator.equals("snapshot id is valid uuid", snapshot.id, snapshotId);
  TestValidator.equals("title is present", snapshot.title.length > 0, true);
  TestValidator.equals(
    "customer reason preserved",
    snapshot.body.length > 0,
    true,
  );
  TestValidator.equals(
    "actor type is customer",
    snapshot.actorType,
    "customer",
  );
  typia.assert(snapshot.createdAt);
  TestValidator.equals(
    "approved at is null (rejected)",
    snapshot.approvedAt,
    null,
  );
  typia.assert(snapshot.rejectedAt!);
  typia.assert(snapshot.sellerRejectionReason!);
  TestValidator.equals(
    "created by is present",
    snapshot.createdBy.length > 0,
    true,
  );
  TestValidator.equals("deleted at is null (active)", snapshot.deletedAt, null);
  // 5. Validate cancellation request summary
  typia.assert(snapshot.cancellationRequest.id);
  TestValidator.equals(
    "cancellation reason matches snapshot body",
    snapshot.cancellationRequest.reason,
    snapshot.body,
  );
  TestValidator.equals(
    "status is rejected",
    snapshot.cancellationRequest.status,
    "rejected",
  );
  typia.assert(snapshot.cancellationRequest.item.id);
  typia.assert(snapshot.cancellationRequest.order.id);
  typia.assert(snapshot.cancellationRequest.seller.id);
}
