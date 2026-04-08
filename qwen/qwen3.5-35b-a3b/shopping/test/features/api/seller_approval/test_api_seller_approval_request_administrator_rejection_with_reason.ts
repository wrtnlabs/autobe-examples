import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
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
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_seller_approval_request_administrator_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    },
  });
  typia.assert(adminResult);
  const adminId: string = adminResult.id;
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerResult);
  const sellerId: string = sellerResult.id;
  // 3. Seller submits approval request with business reason
  const approvalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(approvalRequest);
  const requestId: string = approvalRequest.id;
  // Verify initial status is 'pending'
  TestValidator.equals(
    "initial status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial reviewer is null",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "initial rejection reason is null",
    approvalRequest.rejectionReason,
    null,
  );
  // 4. Administrator rejects the approval request with reason
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminResult.email,
      password: adminPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedRequest =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.update(
      adminLoginConnection,
      {
        requestId: requestId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(updatedRequest);
  // 5. Verify approval request updates
  TestValidator.equals(
    "status changed to rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewer set to administrator",
    updatedRequest.reviewer?.id,
    adminId,
  );
  TestValidator.equals(
    "rejection reason populated",
    updatedRequest.rejectionReason,
    rejectionReason,
  );
  // 6. Verify seller account updates - login to get updated seller status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerResult.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const updatedSellerResult =
    await api.functional.ecommerceMall.auth.seller.login(
      sellerLoginConnection,
      {
        body: {
          email: sellerResult.email,
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      },
    );
  typia.assert(updatedSellerResult);
  TestValidator.equals(
    "seller approval_status is rejected",
    updatedSellerResult.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "seller rejection_reason is populated",
    updatedSellerResult.rejection_reason,
    rejectionReason,
  );
}
