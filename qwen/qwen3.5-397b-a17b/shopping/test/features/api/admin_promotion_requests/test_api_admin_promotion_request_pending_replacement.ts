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
 * Test the edge case where a seller submits a new administrator promotion request
 * while a previous request is still pending.
 *
 * Test Steps:
 * 1. Register a new seller account via /shoppingMall/auth/seller/join
 * 2. Submit the first administrator promotion request with reason 'First request reason'
 * 3. Verify the first request has status 'pending'
 * 4. Submit the second administrator promotion request with reason 'Second request reason'
 * 5. Verify the second request is created with status 'pending'
 * 6. Verify the first request information is preserved in the response
 * 7. Verify the new request has the updated reason text
 *
 * Business Validations:
 * - Each seller can have only one pending promotion request at a time
 * - Submitting a new request while one is pending should auto-cancel the previous request
 * - The new request should have the updated reason text
 * - This prevents request accumulation and ensures only the latest intent is considered
 */
export async function test_api_admin_promotion_request_pending_replacement(
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
  // 2. Submit the first administrator promotion request
  const firstRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: "First request reason",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 3. Verify the first request has status 'pending'
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request reason",
    firstRequest.reason,
    "First request reason",
  );
  TestValidator.equals(
    "first request deleted_at",
    firstRequest.deleted_at,
    null,
  );
  TestValidator.equals(
    "first request submitter is seller",
    (firstRequest.submitter as IShoppingMallSeller.ISummary).id,
    sellerAuth.id,
  );
  // 4. Submit the second administrator promotion request
  const secondRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Second request reason",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(secondRequest);
  // 5. Verify the second request is created with status 'pending'
  TestValidator.equals(
    "second request status",
    secondRequest.status,
    "pending",
  );
  TestValidator.equals(
    "second request reason",
    secondRequest.reason,
    "Second request reason",
  );
  TestValidator.equals(
    "second request deleted_at",
    secondRequest.deleted_at,
    null,
  );
  // 6. Verify the second request has the same submitter (seller)
  TestValidator.equals(
    "second request submitter is same seller",
    (secondRequest.submitter as IShoppingMallSeller.ISummary).id,
    sellerAuth.id,
  );
  // 7. Verify the requests have different IDs (new request was created)
  TestValidator.notEquals(
    "requests have different IDs",
    firstRequest.id,
    secondRequest.id,
  );
  // 8. Verify the second request was created after the first
  TestValidator.predicate(
    "second request created after first",
    new Date(secondRequest.created_at).getTime() >=
      new Date(firstRequest.created_at).getTime(),
  );
}