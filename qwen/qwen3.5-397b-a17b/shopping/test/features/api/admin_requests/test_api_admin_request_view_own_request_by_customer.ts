import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

export async function test_api_admin_request_view_own_request_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get authenticated connection
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with auth token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. Submit admin promotion request
  const adminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Verify request was created with correct status and customer info
  TestValidator.equals("request status", adminRequest.status, "PENDING");
  TestValidator.predicate(
    "has requested_at timestamp",
    adminRequest.requested_at !== null,
  );
  TestValidator.equals(
    "customer id matches",
    adminRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    adminRequest.customer.email,
    customerAuth.email,
  );
  // 5. Retrieve the request using customer connection (own request)
  const retrievedRequest =
    await api.functional.shoppingMall.superAdmin.admin_requests.at(
      customerConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Verify retrieved request matches original
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "status matches",
    retrievedRequest.status,
    adminRequest.status,
  );
  TestValidator.equals(
    "requested_at matches",
    retrievedRequest.requested_at,
    adminRequest.requested_at,
  );
  TestValidator.equals(
    "customer id matches",
    retrievedRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customerAuth.email,
  );
  // 7. Verify responder is null (request still pending)
  TestValidator.equals(
    "no responder yet",
    retrievedRequest.respondedBySuperAdmin,
    null,
  );
  TestValidator.equals(
    "no response time yet",
    retrievedRequest.responded_at,
    null,
  );
}
