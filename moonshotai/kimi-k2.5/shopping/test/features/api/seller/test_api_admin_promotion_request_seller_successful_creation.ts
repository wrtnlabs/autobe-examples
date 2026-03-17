import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test seller submitting an administrator promotion request successfully.
 *
 * This test validates the primary success scenario where an authenticated seller
 * submits a valid administrator promotion request. The request should be created
 * with "pending" status awaiting super administrator review.
 *
 * Test Flow:
 * 1. Authenticate as a seller using email/password registration
 * 2. Submit a valid admin promotion request with a compelling reason
 * 3. Validate the response structure and initial state
 */
export async function test_api_admin_promotion_request_seller_successful_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // Step 2: Submit admin promotion request with a compelling reason
  const requestReason =
    "I have extensive experience in e-commerce platform management and want to help moderate the marketplace by reviewing seller applications and handling disputes.";
  const promotionRequest: IEcommerceMallAdminPromotionRequest =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.create(
      sellerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Step 3: Validate response fields
  // Validate status is pending
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  // Validate reason matches input exactly
  TestValidator.equals(
    "reason matches input",
    promotionRequest.reason,
    requestReason,
  );
  // Validate null fields for new request
  TestValidator.equals("reviewer is null", promotionRequest.reviewer, null);
  TestValidator.equals(
    "rejectionReason is null",
    promotionRequest.rejectionReason,
    null,
  );
  TestValidator.equals("deletedAt is null", promotionRequest.deletedAt, null);
  // Validate timestamps exist and are valid ISO strings
  typia.assertGuard<string & tags.Format<"date-time">>(
    promotionRequest.createdAt,
  );
  typia.assertGuard<string & tags.Format<"date-time">>(
    promotionRequest.updatedAt,
  );
  // Validate requester is the authenticated seller
  TestValidator.predicate(
    "requester is seller type",
    () => "shopName" in promotionRequest.requester,
  );
  TestValidator.equals(
    "requester id matches seller",
    promotionRequest.requester.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "requester email matches seller",
    promotionRequest.requester.email,
    sellerAuth.email,
  );
}
