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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_seller_administrator_promotion_requests_create";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Test seller retrieval of pending administrator promotion request details.
 *
 * Validates the complete seller promotion request retrieval workflow including seller authentication, promotion request submission, and pending request detail retrieval. Ensures that the retrieved request correctly reflects the seller's submitted information and proper pending state characteristics.
 *
 * Special attention is given to verifying that pending requests have null values for review-related fields (rejectionReason, reviewedByAdmin, reviewedAt) while maintaining valid timestamps and the seller's original justification reason.
 *
 * 1. Seller joins the platform to authenticate for promotion request operations.
 * 2. Seller submits an administrator promotion request with a pending status and written justification.
 * 3. Seller retrieves the full request details using the requestId.
 * 4. Validates response fields: id, actorType ('seller'), reason, status ('pending'), and pending-state null fields.
 * 5. Confirms rejectionReason is null, reviewedByAdmin is null, and reviewedAt is null for pending status.
 */
export async function test_api_seller_promotion_request_pending_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Seller submits an administrator promotion request
  const request =
    await generate_random_ecommerce_platform_seller_administrator_promotion_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(request);
  // 3. Retrieve the full request details using the requestId
  const retrieved =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.at(
      sellerConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate response fields
  TestValidator.equals("request id matches", retrieved.id, request.id);
  TestValidator.equals("actor type is seller", retrieved.actorType, "seller");
  TestValidator.equals("reason preserved", retrieved.reason, request.reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  // 5. Validate pending state fields are null
  TestValidator.equals(
    "rejection reason is null",
    retrieved.rejectionReason,
    null,
  );
  TestValidator.equals(
    "reviewed by admin is null",
    retrieved.reviewedByAdmin,
    null,
  );
  TestValidator.equals("reviewed at is null", retrieved.reviewedAt, null);
  // Validate timestamps are properly populated
  TestValidator.predicate(
    "created at is defined",
    retrieved.createdAt !== undefined && retrieved.createdAt !== "",
  );
  TestValidator.predicate(
    "updated at is defined",
    retrieved.updatedAt !== undefined && retrieved.updatedAt !== "",
  );
}
