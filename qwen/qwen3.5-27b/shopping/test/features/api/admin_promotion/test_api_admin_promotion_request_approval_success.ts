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
 * Test admin promotion request approval success workflow.
 * 1. Regular admin registers and submits promotion request
 * 2. Super admin approves the request
 * 3. Validate status transition and timestamps
 */
export async function test_api_admin_promotion_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as regular admin
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(regularAdmin);
  // 2. Submit promotion request as regular admin
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial responded_at is null",
    promotionRequest.responded_at,
    null,
  );
  // 3. Register and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // 4. Approve the promotion request as super admin
  const approvedRequest =
    await api.functional.shoppingMall.admin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate approval results
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set",
    approvedRequest.responded_at !== null,
  );
  TestValidator.equals(
    "request ID matches",
    approvedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "admin ID matches",
    approvedRequest.admin.id,
    regularAdmin.id,
  );
  TestValidator.predicate(
    "reason preserved",
    approvedRequest.reason.length > 0,
  );
  TestValidator.equals(
    "submitted_at unchanged",
    approvedRequest.submitted_at,
    promotionRequest.submitted_at,
  );
}
