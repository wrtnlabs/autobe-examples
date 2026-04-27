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

export async function test_api_seller_approval_already_reviewed_conflict_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Promote administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // Step 3: Create seller account (approval_status = 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Step 4: Seller submits an approval request
  const initialRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(initialRequest);
  TestValidator.equals(
    "initial approval request status",
    initialRequest.status,
    "pending",
  );
  // Step 5: Super administrator rejects this initial approval request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
      superAdminConnection,
      {
        requestId: initialRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "approval request rejected status",
    rejectedRequest.status,
    "rejected",
  );
  // Step 6: Seller submits a new approval request after rejection
  const newApprovalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(newApprovalRequest);
  TestValidator.equals(
    "new approval request status",
    newApprovalRequest.status,
    "pending",
  );
  // Step 7 (setup): Super administrator approves the new approval request
  const firstApproval =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
      superAdminConnection,
      {
        requestId: newApprovalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(firstApproval);
  TestValidator.equals(
    "approval request was approved",
    firstApproval.status,
    "approved",
  );
  // Step 8 (test): Attempting to approve the same request again should fail with 422
  await TestValidator.httpError(
    "already reviewed approval request should be rejected",
    422,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
        superAdminConnection,
        {
          requestId: newApprovalRequest.id,
          body: {
            status: "approved",
          } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
        },
      );
    },
  );
  // Verify seller's approval_status remains 'approved'
  TestValidator.equals(
    "seller approval status unchanged after failed second attempt",
    firstApproval.seller.approval_status,
    "approved",
  );
}
