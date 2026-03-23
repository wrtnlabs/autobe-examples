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
 * Test admin promotion request rejection workflow.
 * 1. Regular admin registers and submits promotion request
 * 2. Super admin authenticates and rejects the request
 * 3. Verify request status changed to 'rejected' with responded_at timestamp
 * 4. Verify requesting admin's grade remains 'regular' (not promoted)
 * 5. Verify rejected admin can submit a new promotion request
 */
export async function test_api_admin_promotion_request_rejection_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Regular admin registration and authentication
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: regularAdminEmail,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Regular admin submits promotion request
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason:
            "I need super admin privileges to manage other administrators and oversee platform operations.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "responded_at is null initially",
    promotionRequest.responded_at === null,
  );
  // 3. Super admin registration and authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 4. Super admin rejects the promotion request
  const rejectedRequest =
    await api.functional.shoppingMall.admin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Verify rejection workflow
  TestValidator.equals(
    "status changed to rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "responded_at is set after rejection",
    rejectedRequest.responded_at !== null,
  );
  TestValidator.equals(
    "requesting admin email matches",
    rejectedRequest.admin.email,
    regularAdminEmail,
  );
  TestValidator.equals(
    "requesting admin grade remains regular",
    rejectedRequest.admin.grade,
    "regular",
  );
  // 6. Verify rejected admin can submit a new promotion request
  const newPromotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason:
            "I am resubmitting my promotion request after addressing the previous rejection feedback.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(newPromotionRequest);
  TestValidator.equals(
    "new request has pending status",
    newPromotionRequest.status,
    "pending",
  );
  TestValidator.notEquals(
    "new request has different ID",
    newPromotionRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "new request belongs to same admin",
    newPromotionRequest.admin.email,
    regularAdminEmail,
  );
}
