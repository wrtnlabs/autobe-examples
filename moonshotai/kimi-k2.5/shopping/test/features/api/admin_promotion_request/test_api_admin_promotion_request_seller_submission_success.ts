import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
 * Test successful submission of an administrator promotion request by an authenticated seller.
 * The seller provides a valid reason explaining their qualifications for becoming an administrator.
 * The system creates a new promotion request with status 'pending' and returns complete request entity.
 */
export async function test_api_admin_promotion_request_seller_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  // 2. Prepare promotion request body with valid reason (10-1000 chars)
  const reason =
    "I have extensive experience managing e-commerce platforms with over 10 years of industry knowledge. I would like to contribute as an administrator to help maintain platform quality and assist other sellers.";
  // 3. Submit promotion request
  const promotionRequest: IEcommerceMallAdminPromotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: { reason } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  // 4. Validate the response structure
  typia.assert(promotionRequest);
  // 5. Validate business logic - status is pending
  TestValidator.equals(
    "status equals 'pending'",
    promotionRequest.status,
    "pending",
  );
  // 6. Validate reason matches input
  TestValidator.equals(
    "reason matches input reason",
    promotionRequest.reason,
    reason,
  );
  // 7. Validate null fields for pending request
  TestValidator.equals(
    "rejectionReason is null",
    promotionRequest.rejectionReason,
    null,
  );
  TestValidator.equals("reviewer is null", promotionRequest.reviewer, null);
  TestValidator.equals("deletedAt is null", promotionRequest.deletedAt, null);
  // 8. Validate requester polymorphic relation - should be the seller
  TestValidator.equals(
    "requester id matches seller",
    promotionRequest.requester.id,
    seller.id,
  );
  TestValidator.equals(
    "requester email matches seller",
    (promotionRequest.requester as IEcommerceMallSeller).email,
    seller.email,
  );
  // 9. Validate timestamps - createdAt equals updatedAt on initial submission
  TestValidator.equals(
    "createdAt equals updatedAt on initial submission",
    promotionRequest.createdAt,
    promotionRequest.updatedAt,
  );
}