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
 * Test duplicate pending promotion request prevention for sellers.
 *
 * This test verifies that the system prevents sellers from submitting multiple
 * pending administrator promotion requests simultaneously. When a seller already
 * has a pending request, any subsequent submission attempts should be rejected
 * with an appropriate error response.
 *
 * Test Flow:
 * 1. Authenticate as a new seller
 * 2. Submit seller registration application
 * 3. Submit first admin promotion request (should succeed with pending status)
 * 4. Attempt to submit second promotion request (should be rejected)
 * 5. Verify the rejection prevents duplicate pending requests
 */
export async function test_api_admin_promotion_request_duplicate_pending_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate as seller
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Submit seller registration application
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 3. Submit first admin promotion request - should succeed
  const firstRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  // 4. Attempt second promotion request - should be rejected due to existing pending request
  await TestValidator.error(
    "duplicate pending promotion request should be rejected",
    async () => {
      await api.functional.ecommerceMall.seller.admin_promotion_requests.create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
        },
      );
    },
  );
}
