import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test prevention of duplicate pending promotion requests.
 *
 * Validates that a seller cannot submit multiple admin promotion requests
 * while having a pending request. First submission succeeds with 'pending'
 * status, second submission is rejected with HTTP 409 Conflict.
 */
export async function test_api_admin_promotion_request_seller_duplicate_pending_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller (utility updates connection headers internally)
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // First promotion request - should succeed with pending status
  const firstRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "I want to become an admin to help manage the platform effectively and ensure quality standards.",
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request has pending status",
    firstRequest.status,
    "pending",
  );
  // Second promotion request with different reason - should be rejected with 409 Conflict
  await TestValidator.httpError(
    "duplicate pending promotion request rejected with 409",
    409,
    async () => {
      await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
        sellerConnection,
        {
          body: {
            reason:
              "Another valid reason for requesting administrator privileges on this platform.",
          } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
        },
      );
    },
  );
}
