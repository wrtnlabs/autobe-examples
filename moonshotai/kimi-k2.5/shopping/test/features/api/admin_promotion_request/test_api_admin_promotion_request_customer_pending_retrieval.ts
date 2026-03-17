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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_customer_pending_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000/super-admin/join",
        referrer: "http://localhost:3000/",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // 3. Submit admin promotion request as customer
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 4. Retrieve the promotion request as superAdmin
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.at(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response fields
  TestValidator.equals(
    "id matches created request",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
  TestValidator.equals("deletedAt is null", retrievedRequest.deletedAt, null);
  // Validate requester information (customer)
  TestValidator.equals(
    "requester id matches customer",
    retrievedRequest.requester.id,
    customer.id,
  );
  TestValidator.equals(
    "requester email matches customer",
    retrievedRequest.requester.email,
    customer.email,
  );
  // Validate timestamps
  TestValidator.predicate("createdAt exists", !!retrievedRequest.createdAt);
  TestValidator.predicate("updatedAt exists", !!retrievedRequest.updatedAt);
  TestValidator.equals(
    "createdAt equals updatedAt for new request",
    retrievedRequest.createdAt,
    retrievedRequest.updatedAt,
  );
}
