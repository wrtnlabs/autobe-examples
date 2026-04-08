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

export async function test_api_seller_approval_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      password: adminPassword,
    },
  });
  typia.assert(admin);
  // 2. Register a seller (creates pending approval record)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Authenticate as administrator with same credentials
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 4. Get the seller's approval ID from the seller's approval history
  const sellerApprovalId = seller.sellerApprovals[0]?.id;
  TestValidator.equals(
    "seller has approval record",
    sellerApprovalId !== undefined,
    true,
  );
  // 5. Retrieve the seller approval using admin connection
  const approval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.at(
      adminAuthConnection,
      {
        approvalId: sellerApprovalId!,
      },
    );
  typia.assert(approval);
  // 6. Validate response structure - approvalStatus
  TestValidator.equals(
    "approvalStatus is pending",
    approval.approvalStatus,
    "pending",
  );
  // 7. Validate rejection fields exist and are null for pending approval
  TestValidator.equals(
    "rejectionReason is null for pending",
    approval.rejectionReason,
    null,
  );
  TestValidator.equals(
    "rejectedAt is null for pending",
    approval.rejectedAt,
    null,
  );
  // 8. Validate approvalHistory array exists and has entries
  TestValidator.predicate(
    "approvalHistory is array",
    Array.isArray(approval.approvalHistory),
  );
  TestValidator.predicate(
    "approvalHistory has entries",
    approval.approvalHistory.length > 0,
  );
  // 9. Validate the first history entry structure
  const firstHistoryEntry = approval.approvalHistory[0];
  TestValidator.equals(
    "history entry has id",
    firstHistoryEntry.id !== undefined,
    true,
  );
  TestValidator.equals(
    "history entry has status",
    firstHistoryEntry.status,
    "pending",
  );
  TestValidator.equals(
    "history entry has seller reference",
    firstHistoryEntry.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "history entry seller email matches",
    firstHistoryEntry.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "history entry seller id matches",
    firstHistoryEntry.seller.id,
    seller.id,
  );
}