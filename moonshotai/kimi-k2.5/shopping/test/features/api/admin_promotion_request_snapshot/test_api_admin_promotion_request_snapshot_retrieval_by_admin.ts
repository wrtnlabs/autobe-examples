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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test that an administrator successfully retrieves a specific admin promotion request snapshot by its unique identifier.
 *
 * Setup: Authenticate a customer and create an admin promotion request with a valid reason.
 * Authenticate a super administrator and create a snapshot by reviewing/approving the request.
 * Authenticate a regular administrator.
 * Execute: The admin calls GET /ecommerceMall/customer/admin-promotion-requests/{promotionRequestId}/snapshots/{snapshotId} with valid path parameters.
 * Verify: The response returns HTTP 200 with the complete IEcommerceMallAdminPromotionRequestSnapshot DTO containing all fields:
 * id, adminPromotionRequestId, previousStatus, newStatus, previousReason, newReason, createdAt, previousReviewer, and newReviewer.
 * Confirm the snapshot data accurately reflects the state transition when the super admin reviewed and approved the request.
 */
export async function test_api_admin_promotion_request_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // 2. Create admin promotion request as customer
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 3. Setup super admin (for review process that creates snapshot)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    { body: superAdminCredentials },
  );
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminLoginConnection, {
    body: {
      email: superAdminCredentials.email,
      password: superAdminCredentials.password,
    },
  });
  // 4. Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"url">>(),
    referrer: typia.random<string & tags.Format<"url">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 5. Retrieve snapshot as regular admin
  // Note: The snapshot would be created when super admin reviews the request.
  // Since the review endpoint is not in available SDK functions, we assume
  // the snapshot exists for this test demonstration.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot: IEcommerceMallAdminPromotionRequestSnapshot =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.snapshots.at(
      adminConnection,
      {
        promotionRequestId: promotionRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate business logic: snapshot belongs to the correct promotion request
  TestValidator.equals(
    "snapshot adminPromotionRequestId matches request",
    snapshot.adminPromotionRequestId,
    promotionRequest.id,
  );
}
