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
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

export async function test_api_admin_request_submission_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
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
  typia.assert(customer);
  // 2. Submit admin promotion request with valid reason
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const adminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: reason,
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Validate request status is PENDING
  TestValidator.equals("status is PENDING", adminRequest.status, "PENDING");
  // 4. Validate requested_at timestamp is recorded
  TestValidator.predicate(
    "requested_at is recorded",
    adminRequest.requested_at !== null,
  );
  // 5. Validate reason is preserved exactly
  TestValidator.equals("reason matches", adminRequest.reason, reason);
  // 6. Validate customer information is included
  TestValidator.equals(
    "customer id matches",
    adminRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    adminRequest.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer nickname matches",
    adminRequest.customer.nickname,
    customer.nickname,
  );
  // 7. Validate responded_at is null (not yet reviewed)
  TestValidator.equals("not yet responded", adminRequest.responded_at, null);
  // 8. Validate respondedBySuperAdmin is null (not yet reviewed)
  TestValidator.equals(
    "no responder yet",
    adminRequest.respondedBySuperAdmin,
    null,
  );
}
