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

export async function test_api_seller_approval_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 2. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Admin rejects the pending seller registration
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  await api.functional.ecommerceMall.admin.admin.sellers.reject(
    adminConnection,
    {
      sellerId: sellerId,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IEcommerceMallSeller.IUpdate,
    },
  );
  // 4. Seller checks their approval status
  const approvalStatus =
    await api.functional.ecommerceMall.seller.seller.approval_status.at(
      sellerConnection,
    );
  typia.assert(approvalStatus);
  // 5. Validate rejection details
  TestValidator.equals(
    "approval status is rejected",
    approvalStatus.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    approvalStatus.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejectedAt timestamp is populated",
    approvalStatus.rejectedAt !== null,
  );
  // 6. Validate approval history
  TestValidator.predicate(
    "approval history contains rejection record",
    approvalStatus.approvalHistory.length > 0,
  );
  const historyRecord = approvalStatus.approvalHistory[0];
  TestValidator.equals(
    "history status is rejected",
    historyRecord.status,
    "rejected",
  );
  TestValidator.equals(
    "history rejection reason matches",
    historyRecord.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed by admin is present",
    historyRecord.reviewedByAdmin !== null,
  );
}
