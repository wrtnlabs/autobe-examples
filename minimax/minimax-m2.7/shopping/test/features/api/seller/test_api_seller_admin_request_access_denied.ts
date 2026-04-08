import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Test seller access control for admin privilege requests.
 *
 * Validates that sellers cannot view other sellers' admin privilege requests. The system enforces ownership verification so that each seller can only access their own requests. This test creates two separate seller accounts and verifies that one seller cannot retrieve the other's admin request.
 *
 * Business rules being tested:
 * - Sellers can only view their own admin requests
 * - Attempting to access another seller's request returns 403 Forbidden
 * - The ownership verification prevents unauthorized data access
 *
 * 1. Register and authenticate Seller A (first seller account).
 * 2. Create admin privilege request for Seller A, capturing the requestId.
 * 3. Register and authenticate Seller B (second seller account).
 * 4. Attempt to retrieve Seller A's admin request as Seller B.
 * 5. Validate that the operation fails with 403 Forbidden error.
 */
export async function test_api_seller_admin_request_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 2. Create admin privilege request for Seller A
  const adminRequest =
    await generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create(
      sellerAConnection,
      {},
    );
  typia.assert(adminRequest);
  const sellerARequestId = adminRequest.id;
  // 3. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 4. Attempt to retrieve Seller A's admin request as Seller B
  // This should fail with 403 Forbidden due to ownership verification
  await TestValidator.error(
    "access denied for other seller's admin request",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.admin_requests.at(
        sellerBConnection,
        {
          requestId: sellerARequestId,
        },
      );
    },
  );
}
