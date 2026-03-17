import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test super administrator retrieving a snapshot for a rejected promotion request with rejection reason.
 *
 * Flow:
 * 1. Create a super admin account
 * 2. Create a customer account
 * 3. Log in as customer and submit an admin promotion request with reason
 * 4. Log in as super admin and reject the request with status='rejected' and non-empty rejection_reason
 * 5. Retrieve the resulting snapshot via target endpoint
 * 6. Validate snapshot contains complete IEcommerceMallAdminPromotionRequestSnapshot structure with rejection details
 */
export async function test_api_admin_promotion_request_snapshot_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: "http://localhost:3000/superadmin/join",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies Partial<IEcommerceMallCustomer.IJoin>,
  });
  typia.assert(customer);
  // Step 3: Submit admin promotion request as customer
  const requestReason =
    "I have extensive experience in e-commerce management and would like to help moderate the platform.";
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies Partial<IEcommerceMallAdminPromotionRequest.ICreate>,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial reviewer is null",
    promotionRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "initial rejection reason is null",
    promotionRequest.rejectionReason,
    null,
  );
  // Step 4: Login as super admin and reject the request
  const superAdminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminAuthConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  const rejectionReason =
    "Insufficient experience. Please gain more community management experience before reapplying.";
  const rejectedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminAuthConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejectionReason: rejectionReason,
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // Verify rejection was successful
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedRequest.rejectionReason,
    rejectionReason,
  );
  TestValidator.notEquals(
    "reviewer is assigned",
    rejectedRequest.reviewer,
    null,
  );
  if (rejectedRequest.reviewer !== null) {
    TestValidator.equals(
      "reviewer is super admin",
      rejectedRequest.reviewer.id,
      superAdmin.id,
    );
  }
  // Step 5 & 6: Retrieve and validate the snapshot
  // In a real scenario, the snapshot ID would be obtained from the system after rejection
  // For this test, we use the SDK to retrieve the snapshot
  const snapshot =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.at(
      superAdminAuthConnection,
      {
        promotionRequestId: promotionRequest.id,
        snapshotId: typia.random<string>(),
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure and content
  TestValidator.equals(
    "previousStatus is pending",
    snapshot.previousStatus,
    "pending",
  );
  TestValidator.equals("newStatus is rejected", snapshot.newStatus, "rejected");
  TestValidator.equals("previousReason is null", snapshot.previousReason, null);
  TestValidator.equals(
    "newReason contains rejection reason",
    snapshot.newReason,
    rejectionReason,
  );
  TestValidator.equals(
    "previousReviewer is null",
    snapshot.previousReviewer,
    null,
  );
  TestValidator.notEquals(
    "newReviewer is assigned",
    snapshot.newReviewer,
    null,
  );
  if (snapshot.newReviewer !== null) {
    TestValidator.equals(
      "newReviewer is super admin",
      snapshot.newReviewer.id,
      superAdmin.id,
    );
    TestValidator.equals(
      "newReviewer email matches",
      snapshot.newReviewer.email,
      superAdmin.email,
    );
  }
  // Validate IDs
  TestValidator.equals(
    "adminPromotionRequestId matches",
    snapshot.adminPromotionRequestId,
    promotionRequest.id,
  );
  // Validate timestamps
  TestValidator.predicate("createdAt is valid datetime", () =>
    typia.is<string & tags.Format<"date-time">>(snapshot.createdAt),
  );
}
