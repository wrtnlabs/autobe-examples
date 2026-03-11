import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieval of snapshot audit for their product.
 * 1. Join seller account
 * 2. Retrieve snapshot audit record
 * 3. Validate audit contains all required fields
 * 4. Validate seller identity matches audit
 * 5. Validate immutability constraints
 */
export async function test_api_snapshot_audit_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  // Verify seller is approved and not banned
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "approved",
  );
  TestValidator.equals("seller not banned", sellerAuth.is_banned, false);
  // 2. Retrieve snapshot audit
  const auditId = typia.random<string & tags.Format<"uuid">>();
  const audit = await api.functional.ecommerceMall.seller.snapshot_audits.at(
    sellerConnection,
    { auditId },
  );
  typia.assert(audit);
  // 3. Validate seller identity matches audit
  TestValidator.equals(
    "changed by matches seller id",
    audit.changedBy,
    sellerAuth.id,
  );
  // 4. Validate record type is product
  TestValidator.equals("record type is product", audit.recordType, "product");
  // 5. Validate immutability: createdAt equals changedAt, updatedAt equals createdAt
  TestValidator.equals(
    "audit immutability: created equals changed",
    audit.createdAt,
    audit.changedAt,
  );
  TestValidator.equals(
    "audit immutability: updated equals created",
    audit.updatedAt,
    audit.createdAt,
  );
}
