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
 * Test that the system correctly prevents an administrator from submitting
 * a second promotion request while a pending request already exists.
 *
 * 1. Register a new administrator account
 * 2. Submit first promotion request (should succeed with status 'pending')
 * 3. Attempt second promotion request (should fail with 409 Conflict)
 * 4. Validate the duplicate pending request restriction is enforced
 */
export async function test_api_admin_promotion_request_duplicate_pending_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Submit first promotion request - should succeed
  const firstRequest =
    await api.functional.shoppingMall.admin.adminPromotionRequests.create(
      adminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Validate first request is in pending status
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "first request has valid ID",
    firstRequest.id !== undefined,
  );
  // 3. Attempt second promotion request - should fail with 409 Conflict
  await TestValidator.httpError(
    "second request rejected with 409 Conflict",
    409,
    async () =>
      await api.functional.shoppingMall.admin.adminPromotionRequests.create(
        adminConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallAdminPromotionRequest.ICreate,
        },
      ),
  );
}
