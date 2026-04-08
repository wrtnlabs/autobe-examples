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
 * Test that a seller can successfully retrieve their own pending administrator promotion request.
 *
 * Validates the complete workflow where a seller registers, submits an administrator promotion request, and then retrieves their pending request details. The test ensures that the response contains all required fields with correct values, particularly verifying that the status is 'pending' and that reviewer-related fields are null since the request has not yet been reviewed.
 *
 * This test covers the primary success path for the seller promotion request viewing functionality, ensuring that sellers can track the status of their submitted applications.
 *
 * 1. Seller registers and authenticates using the authorize_seller_join utility function.
 * 2. Seller submits an administrator promotion request with a reason using the generate_random_shopping_mall_seller_admin_promotion_requests_create utility function.
 * 3. Seller retrieves their pending promotion request using the GET /shoppingMall/seller/admin-promotion-requests/mine endpoint.
 * 4. Validates that the response contains all required fields with correct values, including status 'pending', null rejection_note, and null reviewer.
 */
export async function test_api_admin_promotion_request_view_pending(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Submit administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 3. Retrieve pending promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.mine.at(
      sellerConnection,
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
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "rejection note is null",
    retrievedRequest.rejection_note,
    null,
  );
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(retrievedRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(retrievedRequest.updated_at)),
  );
}
