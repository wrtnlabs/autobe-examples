import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_seller_administrator_promotion_requests_create";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Test super administrator rejection of a seller's administrator promotion request.
 *
 * Validates the complete rejection workflow where a seller submits an administrator promotion request and a super administrator reviews and rejects it with a rejection reason. Ensures proper status transition from pending to rejected, audit trail population, and immutability of original request fields.
 *
 * The rejection process requires the super administrator to provide a rejection reason explaining the decision. The system automatically populates the reviewing admin's identity and the review timestamp while preserving the original applicant's actor type and written justification.
 *
 * 1. Seller registers and authenticates on the platform.
 * 2. Seller submits an administrator promotion request with written justification, creating a pending record.
 * 3. Super administrator registers and authenticates.
 * 4. Super administrator reviews and rejects the pending promotion request with a rejection reason.
 * 5. Validates that status transitions to "rejected", rejectionReason is populated with the explanation, reviewedByAdmin is set to the super administrator's summary, reviewedAt timestamp is established, and actorType and reason fields remain unchanged as immutable fields.
 */
export async function test_api_administrator_promotion_request_rejection_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate unique seller credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  // 2. Seller joins
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  typia.assert(sellerAuth);
  // 3. Seller logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 4. Seller submits promotion request (creates pending record)
  const promotionRequest =
    await generate_random_ecommerce_platform_seller_administrator_promotion_requests_create(
      sellerConnection,
      { body: { actorType: "seller" } },
    );
  typia.assert(promotionRequest);
  // Verify initial state: pending status, null review fields
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial rejectionReason is null",
    promotionRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "initial reviewedByAdmin is null",
    promotionRequest.reviewedByAdmin,
    null,
  );
  TestValidator.equals(
    "initial reviewedAt is null",
    promotionRequest.reviewedAt,
    null,
  );
  // Capture immutable fields for later comparison
  const originalActorType = promotionRequest.actorType;
  const originalReason = promotionRequest.reason;
  // 5. Generate unique super admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  // 6. Super admin joins
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  typia.assert(adminAuth);
  // 7. Super admin logs in
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 8. Super admin rejects the promotion request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updated =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.update(
      adminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejectionReason,
        } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate,
      },
    );
  typia.assert(updated);
  // 9. Validate rejection outcome
  // Status transition: pending → rejected
  TestValidator.equals(
    "status transitions to rejected",
    updated.status,
    "rejected",
  );
  // Rejection reason matches what was provided
  TestValidator.equals(
    "rejection reason matches",
    updated.rejectionReason,
    rejectionReason,
  );
  // reviewedByAdmin is populated
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    updated.reviewedByAdmin !== null,
  );
  const reviewedByAdmin = typia.assert(updated.reviewedByAdmin!);
  TestValidator.equals(
    "reviewedByAdmin ID matches admin ID",
    reviewedByAdmin.id,
    adminAuth.id,
  );
  // reviewedAt is set (non-null)
  TestValidator.predicate("reviewedAt is set", updated.reviewedAt !== null);
  // Immutable fields: actorType and reason remain unchanged
  TestValidator.equals(
    "actorType remains unchanged",
    updated.actorType,
    originalActorType,
  );
  TestValidator.equals(
    "reason remains unchanged",
    updated.reason,
    originalReason,
  );
}
