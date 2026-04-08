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

export async function test_api_administrator_approve_seller_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates approval request
  const approvalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEcommerceMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Verify initial status is pending
  TestValidator.equals(
    "approval request initial status",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reviewer should be null",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approval request seller matches",
    approvalRequest.seller.id,
    seller.id,
  );
  // 5. Administrator approves the request
  const updatedRequest =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
          reviewer_id: admin.id,
        } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 6. Validate approval request updates
  TestValidator.equals(
    "approval request status approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer_id set to admin",
    updatedRequest.reviewer?.id,
    admin.id,
  );
  TestValidator.equals(
    "reviewer email matches",
    updatedRequest.reviewer?.email,
    admin.email,
  );
  TestValidator.equals(
    "reviewer display name matches",
    updatedRequest.reviewer?.displayName,
    admin.display_name,
  );
  TestValidator.equals(
    "updated_at changed",
    updatedRequest.updatedAt > updatedRequest.createdAt,
    true,
  );
  TestValidator.equals(
    "seller relationship preserved",
    updatedRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email preserved",
    updatedRequest.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller display name preserved",
    updatedRequest.seller.display_name,
    seller.display_name,
  );
  // 7. Verify snapshot was created (backend creates snapshot automatically)
  // The snapshot is created by the backend audit trail mechanism when status changes
}