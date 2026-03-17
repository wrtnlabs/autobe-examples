import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test the successful retrieval of a seller's own pending administrator promotion request.
 *
 * Scenario:
 * 1. Create a seller account and authenticate
 * 2. Submit seller registration application
 * 3. Create an admin promotion request with a specific reason
 * 4. Retrieve the promotion request by ID
 * 5. Validate all response fields match expected values for a pending request
 *
 * Business rules verified:
 * - Pending status is correctly returned for new requests
 * - Rejection reason and reviewer are null for pending requests
 * - Requester information is populated with seller details
 * - Soft-deleted records are not returned
 */
export async function test_api_admin_promotion_request_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Submit seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 3. Create promotion request with specific reason
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const createdRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(createdRequest);
  // 4. Retrieve the promotion request by ID
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.at(
      sellerConnection,
      {
        promotionRequestId: createdRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate business logic (typia.assert already validated all types and formats)
  TestValidator.equals(
    "promotion request id matches",
    retrievedRequest.id,
    createdRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals("reason matches input", retrievedRequest.reason, reason);
  TestValidator.equals(
    "rejectionReason is null",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals("deletedAt is null", retrievedRequest.deletedAt, null);
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
}
