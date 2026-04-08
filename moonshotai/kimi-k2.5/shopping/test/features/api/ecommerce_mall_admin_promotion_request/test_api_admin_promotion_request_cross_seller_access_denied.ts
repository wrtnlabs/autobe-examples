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
 * Test access control enforcement preventing unauthorized access to admin promotion requests.
 * First, authenticate as Seller A and create a pending promotion request, capturing the requestId.
 * Then authenticate as Seller B and attempt to retrieve Seller A's promotion request.
 * Verify that the system rejects this access attempt with an appropriate error response.
 */
export async function test_api_admin_promotion_request_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Seller A and create a promotion request
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerAConnection,
      {
        body: {
          reason: typia.random<
            string & tags.MinLength<10> & tags.MaxLength<1000>
          >(),
        },
      },
    );
  typia.assert(promotionRequest);
  // Capture the request ID for cross-seller access test
  const requestId = promotionRequest.id;
  // Step 2: Authenticate as Seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // Verify Seller B has different ID than Seller A
  TestValidator.notEquals(
    "Seller B is different from Seller A",
    sellerA.id,
    sellerB.id,
  );
  // Step 3: Attempt to retrieve Seller A's promotion request as Seller B
  // According to API spec, only super_admin can access this endpoint
  // Regular sellers should receive 403 Forbidden or 404 Not Found error
  await TestValidator.httpError(
    "cross-seller access denied - only super_admin can view promotion requests",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.seller.admin_promotion_requests.at(
        sellerBConnection,
        {
          requestId: requestId,
        },
      );
    },
  );
}
