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
 * Test that a seller cannot access another seller's administrator promotion request, validating authorization boundaries.
 *
 * Validates that the promotion request system properly enforces ownership-based access control. When a seller attempts to retrieve a promotion request they do not own, the system must reject the request with a 403 Forbidden status rather than 404, preventing information leakage about request existence.
 *
 * The test creates two independent seller accounts with unique credentials. Seller A submits a promotion request, then Seller B attempts to access it using the request ID. The authorization boundary ensures that sellers can only view their own promotion requests, protecting sensitive applicant information from unauthorized access.
 *
 * 1. Seller A joins the platform with unique email and credentials.
 * 2. Seller A submits an administrator promotion request with a reason.
 * 3. Seller B joins the platform with different email and credentials.
 * 4. Seller B attempts to retrieve Seller A's promotion request using the request ID.
 * 5. Validates that the API returns HTTP 403 Forbidden status indicating authorization failure.
 * 6. Confirms that the authorization check validates ownership before returning data.
 */
export async function test_api_admin_promotion_request_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A joins the platform
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller A creates an administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerAConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 3. Seller B joins the platform with different credentials
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 4. Seller B attempts to access Seller A's promotion request
  // 5. Validates HTTP 403 Forbidden is returned (not 404)
  await TestValidator.httpError(
    "seller cannot access another seller's promotion request",
    403,
    async () => {
      await api.functional.shoppingMall.seller.admin_promotion_requests.at(
        sellerBConnection,
        {
          requestId: promotionRequest.id,
        },
      );
    },
  );
}
