import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test the primary success scenario where a super administrator views the complete audit trail
 * for a promotion request that has undergone status transitions. This tests the core business
 * workflow of preserving immutable snapshot records for dispute resolution.
 */
export async function test_api_admin_promotion_request_snapshot_list_with_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Customer submits a promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {},
    );
  typia.assert(promotionRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "promotion request initial status",
    promotionRequest.status,
    "pending",
  );
  // 4. Super admin approves the promotion request (creates snapshot)
  const reviewedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
          rejectionReason: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(reviewedRequest);
  // Verify status was updated to approved
  TestValidator.equals(
    "promotion request status after approval",
    reviewedRequest.status,
    "approved",
  );
  // 5. Retrieve snapshots with default pagination
  const snapshotsResponse =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {} satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate at least one snapshot exists (business logic)
  TestValidator.predicate(
    "at least one snapshot exists after status transition",
    snapshotsResponse.data.length >= 1,
  );
  // 7. Validate first snapshot captures the pending -> approved transition
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "first snapshot previousStatus is pending",
    firstSnapshot.previousStatus,
    "pending",
  );
  TestValidator.equals(
    "first snapshot newStatus is approved",
    firstSnapshot.newStatus,
    "approved",
  );
  // 8. Verify pagination records matches total data count
  TestValidator.equals(
    "pagination records matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
}
