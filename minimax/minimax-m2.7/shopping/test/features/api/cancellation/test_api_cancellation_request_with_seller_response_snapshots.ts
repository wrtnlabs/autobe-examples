import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_with_seller_response_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin to access the cancellation request endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
  };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Generate a UUID for the requestId to test the GET endpoint
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Call GET /ecommerceMall/admin/cancellation-requests/{requestId}
  const cancellationRequest =
    await api.functional.ecommerceMall.admin.cancellation_requests.at(
      adminConnection,
      { requestId },
    );
  typia.assert(cancellationRequest);
  // Validate response structure
  TestValidator.equals("has valid id", typeof cancellationRequest.id, "string");
  TestValidator.equals(
    "has reason",
    typeof cancellationRequest.reason,
    "string",
  );
  TestValidator.equals(
    "has status",
    typeof cancellationRequest.status,
    "string",
  );
  // Status should be 'approved' or 'rejected' (not 'pending') after seller response
  TestValidator.predicate(
    "status is approved or rejected",
    cancellationRequest.status === "approved" ||
      cancellationRequest.status === "rejected",
  );
  // Validate snapshots array contains at least one snapshot record
  TestValidator.predicate(
    "snapshots array has at least one record",
    cancellationRequest.snapshots.length > 0,
  );
  // Verify snapshot includes required fields: id, reason, status, createdAt
  const snapshot = cancellationRequest.snapshots[0];
  typia.assertGuard(snapshot);
  // Verify snapshot id exists and is valid UUID format
  TestValidator.equals("snapshot has valid id", typeof snapshot.id, "string");
  // Verify snapshot reason is preserved at moment of seller response
  TestValidator.equals(
    "snapshot reason matches request reason",
    snapshot.reason,
    cancellationRequest.reason,
  );
  // Verify snapshot status is 'approved' or 'rejected'
  TestValidator.equals(
    "snapshot status is approved or rejected",
    snapshot.status === "approved" || snapshot.status === "rejected",
    true,
  );
  // Verify snapshot has createdAt timestamp
  TestValidator.equals(
    "snapshot has createdAt timestamp",
    typeof snapshot.createdAt === "string",
    true,
  );
  // Validate snapshot preserves cancellation request state at moment of seller response
  // The snapshot.cancellationRequest should reference the parent cancellation request
  TestValidator.equals(
    "snapshot cancellationRequest id matches parent",
    snapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
}
