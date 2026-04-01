import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_customer_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Super administrator retrieves customer details
  const retrievedCustomer =
    await api.functional.shoppingMall.superAdministrator.customers.at(
      superAdminConnection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(retrievedCustomer);
  // 4. Validate retrieved customer data matches
  TestValidator.equals(
    "customer id matches",
    retrievedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "profile id matches",
    retrievedCustomer.profile.id,
    customer.profile.id,
  );
  TestValidator.equals(
    "profile display name matches",
    retrievedCustomer.profile.display_name,
    customer.profile.display_name,
  );
  TestValidator.equals(
    "profile phone number matches",
    retrievedCustomer.profile.phone_number,
    customer.profile.phone_number,
  );
  // 5. Validate customer is not soft deleted (deleted_at should be null)
  TestValidator.equals(
    "customer not deleted",
    retrievedCustomer.deleted_at,
    null,
  );
}
