import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account (creates a pending approval request)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 2. Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 3. Administrator rejects the seller's approval request
  const rejectionReason =
    "Your shop name does not comply with our naming policy.";
  const approvalRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: sellerId,
        body: {
          status: "rejected" as const,
          rejection_reason: rejectionReason,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Seller retrieves their approval request
  const retrieved =
    await api.functional.eCommerceMall.seller.approval_requests.at(
      sellerConnection,
      {
        requestId: sellerId,
      },
    );
  typia.assert(retrieved);
  // 5. Validate rejection details
  TestValidator.equals("request id matches", retrieved.id, approvalRequest.id);
  TestValidator.equals("status is rejected", retrieved.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    retrieved.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection reason is non-empty",
    retrieved.rejection_reason !== null &&
      retrieved.rejection_reason.length > 0,
  );
  TestValidator.predicate(
    "reviewer is present for rejected request",
    retrieved.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed_at is present for rejected request",
    retrieved.reviewed_at !== null,
  );
  TestValidator.equals(
    "seller approval_status is rejected",
    retrieved.seller.approval_status,
    "rejected",
  );
  if (retrieved.reviewed_at !== null && retrieved.reviewer !== null) {
    TestValidator.predicate(
      "created_at is before reviewed_at",
      new Date(retrieved.created_at).getTime() <
        new Date(retrieved.reviewed_at).getTime(),
    );
  }
}
