import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_status_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller with known password (starts with pending status)
  const sellerPassword = "password123";
  const sellerAuthorized = await authorize_seller_join(connection, {
    body: {
      password: sellerPassword,
    },
  });
  const sellerId: string = sellerAuthorized.id;
  // 2. Register an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Admin approves the pending seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId },
    );
  typia.assert(approvedSeller);
  // 4. Seller retrieves their approval status using known credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuthorized.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const approvalStatus =
    await api.functional.ecommerceMall.seller.seller.approval_status.at(
      sellerConnection,
    );
  typia.assert(approvalStatus);
  // 5. Validate the approval status response
  TestValidator.equals(
    "approvalStatus is 'approved'",
    approvalStatus.approvalStatus,
    "approved",
  );
  TestValidator.equals(
    "rejectionReason is null",
    approvalStatus.rejectionReason,
    null,
  );
  TestValidator.equals("rejectedAt is null", approvalStatus.rejectedAt, null);
  // Validate approval history contains at least one record with approved status
  TestValidator.predicate(
    "approvalHistory has at least one record",
    approvalStatus.approvalHistory.length >= 1,
  );
  // Find the approved record in history
  const approvedRecord = approvalStatus.approvalHistory.find(
    (record) => record.status === "approved",
  );
  TestValidator.predicate(
    "has approved record in history",
    approvedRecord !== undefined,
  );
  // Validate the approved record has reviewedByAdmin reference
  if (approvedRecord) {
    TestValidator.predicate(
      "approved record has reviewedByAdmin",
      approvedRecord.reviewedByAdmin !== null &&
        approvedRecord.reviewedByAdmin !== undefined,
    );
  }
}
