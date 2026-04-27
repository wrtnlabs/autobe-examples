import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_views_rejected_approval_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(admin);
  // 2. As seed super admin (base connection), promote the regular admin to super admin
  const superAdminJoinInput = {
    administrator_id: admin.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallSuperAdministrator.IJoin;
  await authorize_super_administrator_join(connection, {
    body: superAdminJoinInput,
  });
  // connection now has the new super admin's auth token
  // 3. Create a seller (approval_status = 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinInput = {
    email: sellerEmail,
    password: sellerPassword,
    shop_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(seller);
  // sellerConnection now has the seller's auth token
  // 4. As the pending seller, submit a registration approval request
  const pendingApprovalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(pendingApprovalRequest);
  const newRequestId = pendingApprovalRequest.id;
  // 5. As super admin, reject the new request to mark seller as 'rejected'
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = { ...connection.headers };
  const initialRejectionReason = "Insufficient business documentation";
  const initialRejectResult =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      superAdminConnection,
      {
        requestId: newRequestId,
        body: {
          status: "rejected" as const,
          rejection_reason: initialRejectionReason,
        },
      },
    );
  typia.assert(initialRejectResult);
  // 6. As the rejected seller, submit a new approval request
  const newApprovalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(newApprovalRequest);
  const secondRequestId = newApprovalRequest.id;
  // 7. As super admin, reject this new approval request
  const rejectionReason =
    "Still missing required business license information and tax identification number";
  const updateResult =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      superAdminConnection,
      {
        requestId: secondRequestId,
        body: {
          status: "rejected" as const,
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(updateResult);
  // 8. As super admin, view the rejected approval request
  const viewedRequest =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.at(
      superAdminConnection,
      {
        requestId: secondRequestId,
      },
    );
  typia.assert(viewedRequest);
  // 9. Validate the response
  TestValidator.equals("request id matches", viewedRequest.id, secondRequestId);
  TestValidator.equals("status is rejected", viewedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    viewedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewer is not null",
    viewedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewer has id",
    typeof viewedRequest.reviewer!.id === "string",
  );
  TestValidator.predicate(
    "reviewer has email",
    typeof viewedRequest.reviewer!.email === "string",
  );
  TestValidator.predicate(
    "reviewed_at is not null",
    viewedRequest.reviewed_at !== null,
  );
  TestValidator.predicate("seller is not null", viewedRequest.seller !== null);
  TestValidator.predicate(
    "seller has id",
    typeof viewedRequest.seller.id === "string",
  );
  TestValidator.predicate(
    "seller has email",
    typeof viewedRequest.seller.email === "string",
  );
  TestValidator.equals(
    "seller approval_status",
    viewedRequest.seller.approval_status,
    "rejected",
  );
  TestValidator.predicate(
    "seller profile shop_name exists",
    typeof viewedRequest.seller.profile.shop_name === "string",
  );
  TestValidator.predicate(
    "created_at is valid",
    typeof viewedRequest.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid",
    typeof viewedRequest.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null",
    viewedRequest.deleted_at === null,
  );
}
