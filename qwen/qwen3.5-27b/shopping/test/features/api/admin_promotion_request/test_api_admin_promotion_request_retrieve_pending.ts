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
 * Test that a super administrator can successfully retrieve details of a pending administrator promotion request.
 * Validates that the promotion request contains all expected fields with correct values including admin info,
 * reason, status='pending', submitted_at timestamp, and responded_at=null.
 */
export async function test_api_admin_promotion_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // 2. Create regular admin connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(regularAdminAuth);
  // 3. Create promotion request using regular admin
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Retrieve promotion request using super admin
  const retrievedRequest =
    await api.functional.shoppingMall.admin.admin_promotion_requests.getByPromotionrequestid(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response fields
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedRequest.admin.email,
    regularAdminAuth.email,
  );
  TestValidator.equals(
    "admin grade is regular",
    retrievedRequest.admin.grade,
    "regular",
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "responded_at is null",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
  TestValidator.predicate("submitted_at is valid date-time", () => {
    const date = new Date(retrievedRequest.submitted_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedRequest.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedRequest.updated_at);
    return !isNaN(date.getTime());
  });
}
