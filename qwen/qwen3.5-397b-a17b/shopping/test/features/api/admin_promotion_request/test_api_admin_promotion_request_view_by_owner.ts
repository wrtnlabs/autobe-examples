import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test seller retrieval of their own administrator promotion request details.
 *
 * Validates the complete workflow where a seller submits an administrator promotion request and subsequently retrieves it to verify the details. This test ensures that sellers can track their promotion request status and view all submitted information.
 *
 * The test covers the full lifecycle from seller registration through promotion request submission and retrieval. It verifies that the response contains all expected fields with correct values for a newly submitted request.
 *
 * 1. Seller registers on the platform with random credentials.
 * 2. Seller submits an administrator promotion request with a reason.
 * 3. Seller retrieves the promotion request using the request ID.
 * 4. Validates response structure, actor_type, status, and null fields for unreviewed requests.
 */
export async function test_api_admin_promotion_request_view_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Submit administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 3. Retrieve the promotion request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.at(
      sellerConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "actor type is seller",
    retrievedRequest.actor_type,
    "seller",
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason matches submitted",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "rejection note is null",
    retrievedRequest.rejection_note,
    null,
  );
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
}
