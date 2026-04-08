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

/**
 * Test that rejected administrator promotion requests cannot be deleted.
 *
 * Business Context: Rejected promotion requests serve as historical records
 * of the decision with rejection reasons preserved. Allowing deletion would
 * remove important reference information for requesters and audit purposes.
 */
export async function test_api_admin_promotion_request_rejected_deletion_blocked(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a pending admin promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 3. Create and authenticate as a superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 4. Reject the promotion request with a reason
  const rejectedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejectionReason: "Insufficient experience for admin role",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Attempt to delete the rejected promotion request - should fail
  await TestValidator.error(
    "deleting rejected promotion request should fail",
    async () => {
      await api.functional.ecommerceMall.seller.admin_promotion_requests.erase(
        sellerConnection,
        {
          requestId: rejectedRequest.id,
        },
      );
    },
  );
}
