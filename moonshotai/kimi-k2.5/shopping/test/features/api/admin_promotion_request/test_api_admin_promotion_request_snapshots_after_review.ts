import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
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
 * Test viewing snapshots after an admin promotion request has been reviewed.
 *
 * This test validates the audit trail functionality where snapshots capture state
 * transitions when a super admin reviews a promotion request. The test:
 * 1. Creates a customer and admin promotion request
 * 2. Creates a super admin and reviews the request (approval)
 * 3. Retrieves snapshots as the customer
 * 4. Validates the snapshot shows the state transition from pending to approved
 */
export async function test_api_admin_promotion_request_snapshots_after_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer and create promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // Create promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(promotionRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "promotion request initial status is pending",
    promotionRequest.status,
    "pending",
  );
  // 2. Setup super admin and approve the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/join",
        referrer: "https://test.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Approve the promotion request
  const reviewReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "approved",
          rejectionReason: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // Verify request was approved
  TestValidator.equals(
    "promotion request status changed to approved",
    updatedRequest.status,
    "approved",
  );
  // 3. Customer retrieves snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {} satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate snapshots
  TestValidator.predicate(
    "snapshots response has pagination data",
    snapshotsResponse.pagination !== null &&
      snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "snapshots data array exists",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsResponse.data.length >= 1,
  );
  // Validate the snapshot shows state transition
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot shows previous status as pending",
    snapshot.previousStatus,
    "pending",
  );
  TestValidator.equals(
    "snapshot shows new status as approved",
    snapshot.newStatus,
    "approved",
  );
  TestValidator.equals(
    "snapshot admin promotion request id matches",
    snapshot.adminPromotionRequestId,
    promotionRequest.id,
  );
  TestValidator.predicate(
    "snapshot has new reviewer information",
    snapshot.newReviewer !== null && snapshot.newReviewer !== undefined,
  );
  TestValidator.equals(
    "snapshot new reviewer id matches super admin",
    snapshot.newReviewer!.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "snapshot has created timestamp",
    snapshot.createdAt !== null && snapshot.createdAt !== undefined,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records matches data count",
    snapshotsResponse.pagination.records === snapshotsResponse.data.length,
  );
}
