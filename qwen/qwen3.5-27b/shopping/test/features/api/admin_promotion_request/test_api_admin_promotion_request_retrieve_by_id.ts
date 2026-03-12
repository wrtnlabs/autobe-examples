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
 * Test retrieving a specific administrator promotion request by its unique identifier.
 *
 * This test validates the GET /shoppingMall/admin/admin-promotion-requests/{requestId} endpoint
 * by creating a promotion request and then retrieving it to verify all fields are correctly
 * populated and the response structure matches the expected schema.
 */
export async function test_api_admin_promotion_request_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Setup: Create promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {
        body: {
          reason: reason,
        },
      },
    );
  typia.assert(promotionRequest);
  // 3. Test: Retrieve the promotion request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.admin.admin_promotion_requests.getByRequestid(
      adminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validation: Verify response structure and fields
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "reason matches submitted",
    retrievedRequest.reason,
    reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.predicate(
    "submitted_at is valid",
    retrievedRequest.submitted_at !== undefined,
  );
  TestValidator.equals(
    "responded_at is null for pending",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
  // 5. Validation: Verify admin summary fields
  TestValidator.equals(
    "admin ID matches",
    retrievedRequest.admin.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedRequest.admin.email,
    adminAuth.email,
  );
  TestValidator.predicate(
    "admin grade exists",
    retrievedRequest.admin.grade !== undefined,
  );
  TestValidator.predicate(
    "admin status exists",
    retrievedRequest.admin.status !== undefined,
  );
  TestValidator.predicate(
    "admin created_at exists",
    retrievedRequest.admin.created_at !== undefined,
  );
}
