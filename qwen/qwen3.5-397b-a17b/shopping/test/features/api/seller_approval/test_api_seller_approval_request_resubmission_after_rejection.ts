import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_seller_approval_request_resubmission_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create seller account (initial approval request is auto-created on registration)
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  // 2. Create administrator account
  const adminJoinResult = await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoinResult);
  // 3. Administrator login to get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 4. Seller login to get authenticated connection (with required href and referrer)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Create a new approval request to test the resubmission workflow
  // Since we cannot fetch the auto-created request from registration,
  // we create a new request and then simulate the rejection/resubmission flow
  const initialRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(initialRequest);
  // 6. Administrator rejects the initial request
  const rejectionReason =
    "Incomplete documentation. Please resubmit with all required business registration documents.";
  const rejectionResult =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: initialRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectionResult);
  // 7. Verify rejection was successful
  TestValidator.equals("rejection status", rejectionResult.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    rejectionResult.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    rejectionResult.reviewed_at !== null &&
      rejectionResult.reviewed_at !== undefined,
  );
  // 8. Seller submits new approval request (resubmission after rejection)
  const resubmissionResult =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(resubmissionResult);
  // 9. Verify new request is created with correct status and properties
  TestValidator.equals(
    "new request status is pending",
    resubmissionResult.status,
    "pending",
  );
  TestValidator.predicate(
    "new request has submitted_at",
    resubmissionResult.submitted_at !== undefined,
  );
  TestValidator.notEquals(
    "new request has different ID from rejected request",
    resubmissionResult.id,
    initialRequest.id,
  );
  TestValidator.equals(
    "new request seller matches",
    resubmissionResult.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "new request has no rejection reason initially",
    resubmissionResult.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "new request not yet reviewed",
    resubmissionResult.reviewed_at === null ||
      resubmissionResult.reviewed_at === undefined,
  );
  TestValidator.predicate(
    "new request created_at is set",
    resubmissionResult.created_at !== undefined,
  );
  TestValidator.predicate(
    "new request updated_at is set",
    resubmissionResult.updated_at !== undefined,
  );
  TestValidator.equals(
    "new request deleted_at is null",
    resubmissionResult.deleted_at,
    null,
  );
}
