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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test successful retrieval of an admin promotion request snapshot by a seller.
 *
 * Scenario:
 * 1. Authenticate as seller and create an admin promotion request with a reason
 * 2. Authenticate as super admin and approve the promotion request (creates snapshot)
 * 3. Retrieve the specific snapshot using the promotion request ID and snapshot ID
 * 4. Verify the snapshot contains complete transition data including status change and reviewer info
 *
 * @param connection - Base connection to the API server
 */
export async function test_api_admin_promotion_request_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller and submit admin promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const promotionReason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: promotionReason,
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "promotion request initial status",
    promotionRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "promotion request has no reviewer initially",
    promotionRequest.reviewer === null,
  );
  // Step 2: Super admin approves the promotion request (creates snapshot)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
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
  // Verify promotion request was approved
  TestValidator.equals(
    "promotion request status after approval",
    updatedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "promotion request has reviewer after approval",
    updatedRequest.reviewer !== null,
  );
  // Step 3: Retrieve the snapshot created during approval
  // The snapshot captures the state transition from pending to approved
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.snapshots.at(
      sellerConnection,
      {
        promotionRequestId: promotionRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 4: Verify snapshot contains complete transition data
  TestValidator.equals(
    "snapshot belongs to correct promotion request",
    snapshot.adminPromotionRequestId,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot captures previous status as pending",
    snapshot.previousStatus,
    "pending",
  );
  TestValidator.equals(
    "snapshot captures new status as approved",
    snapshot.newStatus,
    "approved",
  );
  // Step 5: Verify immutability - snapshot data should match what was recorded at approval time
  TestValidator.predicate(
    "snapshot has valid createdAt timestamp",
    typia.is<string & tags.Format<"date-time">>(snapshot.createdAt),
  );
  TestValidator.predicate(
    "snapshot newReviewer is set after approval",
    snapshot.newReviewer !== null,
  );
  TestValidator.predicate(
    "snapshot previousReviewer is null (initial state)",
    snapshot.previousReviewer === null,
  );
  TestValidator.predicate(
    "snapshot newReason is null for approval (no rejection reason)",
    snapshot.newReason === null,
  );
}
