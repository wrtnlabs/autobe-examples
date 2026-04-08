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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that a super administrator can retrieve any seller's administrator promotion request for review purposes.
 *
 * Validates the complete promotion request retrieval workflow including super administrator authentication, seller account creation, promotion request submission, and super admin access to the request details. Ensures that super administrators have elevated permissions to view all promotion requests across the platform regardless of ownership.
 *
 * Special attention is given to verifying that the super administrator can access promotion requests submitted by sellers, which is critical for the review workflow where super admins evaluate requests and make approve/reject decisions.
 *
 * 1. Super administrator joins the platform and gets authenticated.
 * 2. Seller joins the platform and gets authenticated.
 * 3. Seller submits an administrator promotion request with a reason.
 * 4. Super administrator retrieves the seller's promotion request using the request ID.
 * 5. Validates that all fields are accessible including id, actor_type, reason, status, and timestamps.
 */
export async function test_api_admin_promotion_request_view_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Seller setup
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
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 3. Seller submits administrator promotion request
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
  // 4. Super administrator retrieves the promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate the retrieved request matches the created request
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "actor type is seller",
    retrievedRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.predicate(
    "reviewer is null for pending request",
    retrievedRequest.reviewer === null ||
      retrievedRequest.reviewer === undefined,
  );
  TestValidator.predicate(
    "rejection note is null for pending request",
    retrievedRequest.rejection_note === null ||
      retrievedRequest.rejection_note === undefined,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof retrievedRequest.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof retrievedRequest.updated_at === "string",
  );
}
