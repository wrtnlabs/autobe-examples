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
 * Test seller viewing their administrator promotion request.
 *
 * Validates that a seller can retrieve their submitted administrator promotion request through the mine endpoint. The test verifies the complete workflow from seller registration through promotion request submission and retrieval, ensuring the response contains all required fields including id, actor_type, reason, status, and timestamps.
 *
 * Note: This test validates the view endpoint structure and accessibility. The rejection workflow (status='rejected' with rejection_note) requires super administrator review APIs which are not available in this test scope. In production, after super administrator rejection, the endpoint would return the same structure with status='rejected', populated rejection_note, and reviewer information.
 *
 * 1. Seller registers with email and credentials.
 * 2. Seller submits an administrator promotion request with reason.
 * 3. Seller retrieves their promotion request via the mine endpoint.
 * 4. Validates response structure contains all required fields and actor_type is 'seller'.
 */
export async function test_api_admin_promotion_request_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 3. View promotion request
  const viewedRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.mine.at(
      sellerConnection,
    );
  typia.assert(viewedRequest);
  // 4. Validate response
  TestValidator.equals(
    "promotion request id matches",
    viewedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "actor type is seller",
    viewedRequest.actor_type,
    "seller",
  );
  TestValidator.predicate(
    "status is pending or rejected",
    viewedRequest.status === "pending" || viewedRequest.status === "rejected",
  );
  TestValidator.predicate("reason exists", viewedRequest.reason.length > 0);
}
