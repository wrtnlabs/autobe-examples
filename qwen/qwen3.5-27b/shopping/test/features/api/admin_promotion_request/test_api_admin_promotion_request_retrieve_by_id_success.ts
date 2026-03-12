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
 * Test retrieving an administrator promotion request by ID.
 *
 * This test validates the success path for fetching a specific promotion
 * request. A super administrator authenticates, creates a promotion request,
 * and then retrieves it by ID. The test verifies that all fields are correctly
 * populated, including nested admin information and proper null handling for
 * pending requests.
 */
export async function test_api_admin_promotion_request_retrieve_by_id_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "12345678",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: "192.168.1.100",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a promotion request
  const request =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {
        body: {
          reason:
            "I need super administrator privileges to manage platform operations and approve seller applications.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(request);
  // 3. Retrieve the promotion request by ID
  const retrieved =
    await api.functional.shoppingMall.admin.adminPromotionRequests.at(
      adminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate the retrieved request matches the created request
  TestValidator.equals("request ID matches", retrieved.id, request.id);
  TestValidator.equals("reason matches", retrieved.reason, request.reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "responded_at is null for pending",
    retrieved.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // 5. Validate nested admin object
  TestValidator.equals(
    "admin ID matches",
    retrieved.admin.id,
    request.admin.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrieved.admin.email,
    request.admin.email,
  );
  TestValidator.equals(
    "admin grade is regular",
    retrieved.admin.grade,
    "regular",
  );
  TestValidator.equals(
    "admin status is active",
    retrieved.admin.status,
    "active",
  );
  TestValidator.equals(
    "admin deleted_at is null",
    retrieved.admin.deleted_at,
    null,
  );
  // 6. Validate timestamp fields exist and are properly formatted
  TestValidator.predicate(
    "submitted_at exists",
    retrieved.submitted_at !== null && retrieved.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    retrieved.created_at !== null && retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrieved.updated_at !== null && retrieved.updated_at !== undefined,
  );
  TestValidator.predicate(
    "admin created_at exists",
    retrieved.admin.created_at !== null &&
      retrieved.admin.created_at !== undefined,
  );
}
