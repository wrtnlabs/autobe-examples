import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(seller);
  // 3. Seller submits admin promotion request
  const promotionReason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: promotionReason,
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Super admin rejects the promotion request with reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const reviewedRequest =
    await api.functional.ecommerceMall.superAdmin.admins.promotion_requests.review(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          decision: "reject",
          rejectionReason: rejectionReason,
        } satisfies IEcommerceMallAdminPromotionRequest.IReview,
      },
    );
  typia.assert(reviewedRequest);
  // 5. Validate rejection response
  TestValidator.equals(
    "status is rejected",
    reviewedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    reviewedRequest.rejectionReason,
    rejectionReason,
  );
  TestValidator.notEquals("reviewer is set", reviewedRequest.reviewer, null);
  TestValidator.equals(
    "reviewer id matches super admin",
    reviewedRequest.reviewer?.id,
    superAdmin.id,
  );
}
