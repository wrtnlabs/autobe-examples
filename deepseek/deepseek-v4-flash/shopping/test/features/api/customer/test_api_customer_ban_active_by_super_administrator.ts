import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_ban_active_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a superAdministrator by promoting a pre-seeded regular administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Register a new customer with a known password for later login verification
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      password: customerPassword,
    },
  });
  typia.assert(customer);
  // 3. Super administrator bans the customer
  const bannedCustomer =
    await api.functional.eCommerceMall.superAdministrator.customers.ban(
      superAdminConnection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(bannedCustomer);
  // 4. Verify banned_at is set to a non-null timestamp
  TestValidator.predicate(
    "banned_at should be set after ban",
    bannedCustomer.banned_at !== null,
  );
  // 5. Verify the banned customer cannot log in
  await TestValidator.error(
    "banned customer login should be rejected",
    async () => {
      await api.functional.eCommerceMall.auth.customer.login(
        { host: connection.host },
        {
          body: {
            email: customer.email,
            password: customerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IECommerceMallCustomer.ILogin,
        },
      );
    },
  );
}
