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
 * Test that a regular administrator can successfully submit an administrator promotion request to request elevated super administrator privileges.
 * 1. Register a new administrator account using authorize_admin_join
 * 2. Submit a promotion request via generate_random_shopping_mall_admin_admin_promotion_requests_create
 * 3. Verify the response contains the created promotion request with 'pending' status
 * 4. Validate all required fields and timestamps are properly set
 */
export async function test_api_admin_promotion_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Prepare the promotion request reason
  const submittedReason = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Submit a promotion request using the utility function
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {
        body: {
          reason: submittedReason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Validate business logic
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  TestValidator.equals(
    "reason matches input",
    promotionRequest.reason,
    submittedReason,
  );
  TestValidator.equals(
    "responded_at is null",
    promotionRequest.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", promotionRequest.deleted_at, null);
  // 5. Validate the admin object in the response
  TestValidator.equals(
    "admin id matches",
    promotionRequest.admin.id,
    authorized.id,
  );
  TestValidator.equals(
    "admin email matches",
    promotionRequest.admin.email,
    authorized.email,
  );
  TestValidator.equals(
    "admin grade is regular",
    promotionRequest.admin.grade,
    "regular",
  );
  TestValidator.equals(
    "admin status is active",
    promotionRequest.admin.status,
    "active",
  );
}
