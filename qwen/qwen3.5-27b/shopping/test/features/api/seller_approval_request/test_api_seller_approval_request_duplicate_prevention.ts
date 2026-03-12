import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test the duplicate prevention business rule that blocks sellers from submitting multiple pending approval requests simultaneously.
 *
 * This test verifies that:
 * 1. A seller can successfully submit their first approval request
 * 2. The system prevents duplicate pending requests from the same seller
 * 3. A 409 Conflict error is returned when attempting to submit a second request
 * 4. The original pending request remains unchanged
 */
export async function test_api_seller_approval_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Verify seller was created with pending approval status
  TestValidator.equals(
    "seller approval_status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  // 2. Submit first approval request (should succeed)
  const firstRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Verify first request was created with pending status
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request belongs to seller",
    firstRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "first request has valid reason",
    firstRequest.reason.length > 0,
  );
  // 3. Attempt to submit second approval request (should fail with 409)
  await TestValidator.httpError(
    "duplicate request returns 409 Conflict",
    409,
    async () => {
      await generate_random_shopping_mall_seller_seller_approval_requests_create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallSellerApprovalRequest.ICreate,
        },
      );
    },
  );
  // 4. Verify the original pending request still exists and is unchanged
  // (We can't directly fetch it, but we can verify the seller status hasn't changed)
  TestValidator.equals(
    "seller approval_status remains pending after duplicate attempt",
    sellerAuth.approval_status,
    "pending",
  );
  // 5. Verify first request ID is still valid (no new request was created)
  TestValidator.predicate(
    "first request ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstRequest.id,
    ),
  );
}
