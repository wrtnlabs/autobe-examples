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
 * Test retrieving a soft-deleted administrator promotion request returns 404 Not Found.
 *
 * This test verifies that when an administrator promotion request is soft-deleted,
 * attempting to retrieve it by ID returns a 404 Not Found error. This ensures that
 * soft-deleted records are properly filtered out from API responses and treated as
 * non-existent, maintaining data integrity and audit trail preservation.
 */
export async function test_api_admin_promotion_request_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
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
  // 2. Create a promotion request
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  const requestId: string & tags.Format<"uuid"> = promotionRequest.id;
  // 3. Soft-delete the promotion request
  await api.functional.shoppingMall.admin.admin_promotion_requests.erase(
    adminConnection,
    {
      requestId,
    },
  );
  // 4. Attempt to retrieve the soft-deleted request - should return 404
  await TestValidator.httpError(
    "soft-deleted request returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.admin.admin_promotion_requests.getByRequestid(
        adminConnection,
        {
          requestId,
        },
      ),
  );
}
