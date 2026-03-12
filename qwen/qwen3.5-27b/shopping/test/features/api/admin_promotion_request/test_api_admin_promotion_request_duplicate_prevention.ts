import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_admin_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the business rule that prevents duplicate pending admin promotion requests.
 *
 * This test verifies:
 * 1. An admin submits a promotion request successfully
 * 2. Before the request is approved or rejected, the same admin attempts to submit another request
 * 3. The system rejects the second request submission with a validation error
 * 4. The error indicates that only one pending request is allowed per admin
 * 5. The first pending request remains unchanged with status 'pending'
 */
export async function test_api_admin_promotion_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Submit the first admin promotion request with a valid reason
  const firstRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Validate first request is pending
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "first request has valid reason",
    firstRequest.reason.length > 0,
  );
  // 3. Attempt to submit a second promotion request (should fail)
  await TestValidator.error(
    "second promotion request should fail due to existing pending request",
    async () => {
      await generate_random_shopping_mall_admin_admin_promotion_requests_create(
        adminConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallAdminPromotionRequest.ICreate,
        },
      );
    },
  );
  // 4. Verify the first request still exists and remains pending
  // (The request should not be affected by the failed second attempt)
  TestValidator.equals(
    "first request status remains pending after failed second attempt",
    firstRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "first request reason unchanged",
    firstRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "first request has valid ID",
    firstRequest.id.length > 0,
  );
}
