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
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_retrieval_customer_requester(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Customer creates a promotion request
  const createdRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(createdRequest);
  // 3. Super Admin setup - authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123!",
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 4. Super Admin retrieves the promotion request
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.at(
      superAdminConnection,
      {
        promotionRequestId: createdRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate the retrieved request matches the created request
  TestValidator.equals(
    "promotion request ID matches",
    retrievedRequest.id,
    createdRequest.id,
  );
  TestValidator.equals(
    "reason matches customer submission",
    retrievedRequest.reason,
    createdRequest.reason,
  );
  TestValidator.equals(
    "status matches",
    retrievedRequest.status,
    createdRequest.status,
  );
  // Verify the requester is populated (polymorphic - should be customer)
  TestValidator.predicate(
    "has requester information",
    retrievedRequest.requester !== null &&
      retrievedRequest.requester !== undefined,
  );
}
