import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test retrieving a seller's pending administrator promotion request.
 *
 * This test validates the complete workflow:
 * 1. Register a new seller account using the authorization utility function
 * 2. Submit an administrator promotion request with a reason explaining why the seller wants admin access
 * 3. Retrieve the promotion request using the 'me' endpoint
 *
 * Validations:
 * - Verify the response contains the correct actor_type ('seller')
 * - Verify the submitted reason text matches
 * - Verify status is 'pending'
 * - Verify rejection_reason is null
 * - Verify submitter contains seller information (id, email, approval_status)
 * - Verify timestamps (created_at, updated_at) are present
 */
export async function test_api_admin_promotion_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
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
  // 2. Submit an administrator promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: reason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Retrieve the promotion request using the 'me' endpoint
  const retrievedRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.me.at(
      sellerConnection,
    );
  typia.assert(retrievedRequest);
  // 4. Validate the response
  TestValidator.equals(
    "actor_type is seller",
    retrievedRequest.actor_type,
    "seller",
  );
  TestValidator.equals("reason matches", retrievedRequest.reason, reason);
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "rejection_reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "submitter id matches seller",
    retrievedRequest.submitter.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "submitter has seller approval_status",
    "approval_status" in retrievedRequest.submitter,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRequest.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null for active request",
    retrievedRequest.deleted_at === null,
  );
}
