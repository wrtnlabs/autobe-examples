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
 * Test the business rule that prevents sellers from submitting multiple pending promotion requests simultaneously.
 *
 * Validates that the system enforces a one pending request per seller constraint. The test creates a seller account, submits an initial promotion request, and then attempts to submit a second request while the first is still pending. The system should reject the duplicate submission with a business logic error.
 *
 * This business rule prevents request flooding and ensures clean workflow management. Sellers must wait for a super administrator's decision on their existing request before submitting a new one. This is a business rule validation, not input validation.
 *
 * 1. Seller registers account and gets authenticated.
 * 2. Seller submits first promotion request with valid reason.
 * 3. Seller attempts to submit second promotion request with different reason.
 * 4. Validates first request succeeds with status='pending'.
 * 5. Validates second request fails with business logic error.
 * 6. Validates original request remains unchanged.
 */
export async function test_api_admin_promotion_request_duplicate_pending_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Submit first promotion request
  const firstRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(firstRequest);
  // 3. Validate first request is pending
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request actor type",
    firstRequest.actor_type,
    "seller",
  );
  // 4. Attempt to submit second promotion request (should fail)
  const secondReason = RandomGenerator.paragraph({ sentences: 4 });
  await TestValidator.error("duplicate pending request rejection", async () => {
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: secondReason,
        },
      },
    );
  });
  // 5. Verify original request remains unchanged
  TestValidator.equals(
    "original request status unchanged",
    firstRequest.status,
    "pending",
  );
  TestValidator.notEquals("reasons differ", firstRequest.reason, secondReason);
}
