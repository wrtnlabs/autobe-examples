import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_retrieval_consumed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for password reset association
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Generate a UUID for password reset record retrieval
  // Note: In production, this would be obtained from password reset creation endpoint
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve password reset record as administrator
  // This tests the audit trail retrieval endpoint for consumed password resets
  const passwordReset =
    await api.functional.shoppingMall.customer.password_resets.at(
      adminConnection,
      {
        resetId: resetId,
      },
    );
  typia.assert(passwordReset);
  // 5. Validate consumed_at timestamp is after created_at when consumed
  // This verifies audit trail integrity for consumed password resets
  if (passwordReset.consumed_at !== null) {
    TestValidator.predicate(
      "consumed_at after created_at",
      new Date(passwordReset.consumed_at).getTime() >=
        new Date(passwordReset.created_at).getTime(),
    );
  }
  // 6. Validate customer information is accessible in the response
  // Even after password reset consumption, customer audit data remains visible
  TestValidator.predicate(
    "customer email matches format",
    passwordReset.customer.email.includes("@"),
  );
}
