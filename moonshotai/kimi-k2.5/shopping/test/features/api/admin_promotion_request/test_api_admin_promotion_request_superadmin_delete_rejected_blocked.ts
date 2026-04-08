import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_superadmin_delete_rejected_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Submit admin promotion request as seller
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  // 3. Create superAdmin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuthorized);
  // 4. Reject the promotion request
  const rejectedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejectionReason:
            "Insufficient experience and qualifications for administrator role",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejection reason is set",
    rejectedRequest.rejectionReason,
    null,
  );
  // 5. Attempt to delete the rejected request - should fail
  await TestValidator.error(
    "deleting rejected request should be blocked",
    async () => {
      await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.erase(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
        },
      );
    },
  );
}
