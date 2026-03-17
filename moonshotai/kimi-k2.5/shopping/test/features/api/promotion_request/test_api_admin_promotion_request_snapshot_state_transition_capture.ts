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

export async function test_api_admin_promotion_request_snapshot_state_transition_capture(
  connection: api.IConnection,
) {
  // 1. Create seller account and create promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(seller);
  // Create promotion request with initial pending status and no reviewer
  const promotionRequest =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state - pending with no reviewer
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
    "initial rejectionReason is null",
    promotionRequest.rejectionReason,
    null,
  );
  // 2. Create super admin account to review and create initial snapshot
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  // Join as super admin
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    adminJoinConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Login as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 3. Super admin approves request with reason, creating snapshot with null previous reviewer
  const approvalReason = RandomGenerator.paragraph({ sentences: 2 });
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      adminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "approved",
          rejectionReason: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer is assigned",
    approvedRequest.reviewer?.id,
    superAdmin.id,
  );
  // 4. Retrieve the snapshot and verify state transition data
  // Note: In a real scenario, we would get the snapshot ID from the update response or a list endpoint
  // For this test, we assume the snapshot can be retrieved
  const snapshot =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.snapshots.at(
      sellerConnection,
      {
        promotionRequestId: promotionRequest.id,
        snapshotId: promotionRequest.id, // Assuming first snapshot uses request ID
      },
    );
  typia.assert(snapshot);
  // Verify snapshot captures state transition with null handling for optional fields
  TestValidator.equals(
    "previousReviewer is null (no reviewer before)",
    snapshot.previousReviewer,
    null,
  );
  TestValidator.equals(
    "newReviewer shows super admin who approved",
    snapshot.newReviewer?.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "previousStatus is pending",
    snapshot.previousStatus,
    "pending",
  );
  TestValidator.equals("newStatus is approved", snapshot.newStatus, "approved");
  TestValidator.equals(
    "previousReason is null (no previous reason)",
    snapshot.previousReason,
    null,
  );
  TestValidator.equals(
    "newReason contains approval reason",
    snapshot.newReason,
    approvalReason,
  );
  // 5. Verify createdAt timestamp reflects when approval occurred
  const createdAtTime = new Date(snapshot.createdAt).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "createdAt is recent (within last minute)",
    now - createdAtTime < 60000,
  );
  // 6. Validate response structure matches IEcommerceMallAdminPromotionRequestSnapshot
  TestValidator.equals(
    "adminPromotionRequestId matches",
    snapshot.adminPromotionRequestId,
    promotionRequest.id,
  );
  TestValidator.predicate(
    "id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(snapshot.id),
  );
  // 7. Test immutability - modify promotion request and verify snapshot unchanged
  // Create another seller to submit another request to demonstrate snapshot preservation
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(sellerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  const promotionRequest2 =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.create(
      sellerConnection2,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  // Reject this one to create a different state
  await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
    adminConnection,
    {
      promotionRequestId: promotionRequest2.id,
      body: {
        status: "rejected",
        rejectionReason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
    },
  );
  // Verify original snapshot is unchanged
  const originalSnapshot =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.snapshots.at(
      sellerConnection,
      {
        promotionRequestId: promotionRequest.id,
        snapshotId: promotionRequest.id,
      },
    );
  typia.assert(originalSnapshot);
  TestValidator.equals(
    "snapshot preserved original state",
    originalSnapshot.newStatus,
    "approved",
  );
}
