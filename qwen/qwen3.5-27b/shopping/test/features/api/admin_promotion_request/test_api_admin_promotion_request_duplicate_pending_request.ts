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

export async function test_api_admin_promotion_request_duplicate_pending_request(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the business rule that prevents users from submitting multiple pending promotion requests simultaneously.
   * 1. Register and authenticate a new administrator user
   * 2. Submit a valid promotion request with a reason
   * 3. Verify the first request is created successfully with status 'pending'
   * 4. Attempt to submit a second promotion request with a different reason
   * 5. Verify the system rejects the second request with 409 Conflict error
   */
  // 1. Register and authenticate a new administrator user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Submit first promotion request
  const firstRequest =
    await api.functional.shoppingMall.admin.admin_promotion_requests.create(
      adminConnection,
      {
        body: {
          reason:
            "I have extensive experience managing e-commerce platforms and believe I can contribute to improving the shopping mall system.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 3. Verify first request was created successfully with 'pending' status
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "first request has valid reason",
    firstRequest.reason.length > 0,
  );
  // 4. Attempt to submit second promotion request (should fail)
  await TestValidator.httpError(
    "duplicate pending request rejected with 409",
    409,
    async () => {
      await api.functional.shoppingMall.admin.admin_promotion_requests.create(
        adminConnection,
        {
          body: {
            reason:
              "This is a second request that should be rejected because a pending request already exists.",
          } satisfies IShoppingMallAdminPromotionRequest.ICreate,
        },
      );
    },
  );
}
