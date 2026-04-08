import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_cross_customer_access_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A connection and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Customer A creates a promotion request
  const customerARequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerAConnection,
      {
        body: {
          reason: typia.random<
            string & tags.MinLength<10> & tags.MaxLength<1000>
          >(),
        },
      },
    );
  typia.assert(customerARequest);
  // 3. Create Customer B connection and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Customer B attempts to access Customer A's promotion request
  // This should fail with access denied error
  await TestValidator.error(
    "Customer B should not be able to access Customer A's promotion request",
    async () => {
      await api.functional.ecommerceMall.customer.admin_promotion_requests.at(
        customerBConnection,
        {
          requestId: customerARequest.id,
        },
      );
    },
  );
  // 5. Verify Customer A can still access their own request
  const customerARetrievedRequest =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.at(
      customerAConnection,
      {
        requestId: customerARequest.id,
      },
    );
  typia.assert(customerARetrievedRequest);
  TestValidator.equals(
    "request IDs match",
    customerARetrievedRequest.id,
    customerARequest.id,
  );
}
