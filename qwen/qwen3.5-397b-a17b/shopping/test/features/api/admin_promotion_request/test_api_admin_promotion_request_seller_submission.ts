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
 * Test seller administrator promotion request submission.
 *
 * This test verifies that an authenticated seller can successfully submit
 * an administrator promotion request with a valid reason. The request should
 * be created with 'pending' status and proper seller information.
 *
 * Test Steps:
 * 1. Register a new seller account using authorize_seller_join utility
 * 2. Create seller-specific connection with authentication token
 * 3. Submit administrator promotion request using generate_random_shopping_mall_seller_admin_promotion_requests_create utility
 * 4. Validate response contains correct actor_type, status, reason, and submitter information
 */
export async function test_api_admin_promotion_request_seller_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account and get authentication
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Submit administrator promotion request with custom reason
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
  // 4. Validate promotion request response - business logic only (typia.assert validates types)
  TestValidator.equals(
    "actor_type is seller",
    promotionRequest.actor_type,
    "seller",
  );
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  TestValidator.equals("reason matches input", promotionRequest.reason, reason);
  // 5. Validate submitter information is seller type with approval_status
  TestValidator.equals(
    "submitter id matches seller",
    promotionRequest.submitter.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "submitter email matches seller",
    promotionRequest.submitter.email,
    sellerAuth.token.refresh.split("@")[0] || "",
  );
  TestValidator.predicate(
    "submitter has approval_status field",
    "approval_status" in promotionRequest.submitter,
  );
}
