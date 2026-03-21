import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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

export async function test_api_refund_request_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      name: "Test Admin",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(admin);
  // Step 2: Retrieve refund request snapshot with known IDs
  // Note: In real E2E scenarios, these IDs would come from:
  // 1. Creating a seller and customer
  // 2. Creating products and orders
  // 3. Having customer create refund request
  // 4. Having seller respond to create snapshot
  // For this test, we use UUIDs that should exist in the seeded test database
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        requestId,
        snapshotId,
      },
    );
  // Validate response structure with typia.assert()
  typia.assert(snapshot);
  // Validate sellerResponse is either 'approved' or 'rejected'
  TestValidator.predicate(
    "sellerResponse is valid value",
    snapshot.sellerResponse === "approved" ||
      snapshot.sellerResponse === "rejected",
  );
  // Validate sellerResponseReason logic:
  // If approved, reason should be null; if rejected, reason should contain text
  if (snapshot.sellerResponse === "approved") {
    TestValidator.equals(
      "approved refund has no reason",
      snapshot.sellerResponseReason,
      null,
    );
  } else if (snapshot.sellerResponse === "rejected") {
    TestValidator.predicate(
      "rejected refund has reason",
      snapshot.sellerResponseReason !== null &&
        snapshot.sellerResponseReason !== undefined &&
        snapshot.sellerResponseReason.length > 0,
    );
  }
}