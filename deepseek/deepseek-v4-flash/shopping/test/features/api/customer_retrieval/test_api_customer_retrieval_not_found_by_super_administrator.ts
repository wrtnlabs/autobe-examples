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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_customer_retrieval_not_found_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Promote the administrator to super administrator
  const superAdmin = await authorize_super_administrator_join(adminConnection, {
    body: {
      administrator_id: admin.id,
    },
  });
  typia.assert(superAdmin);
  // Step 3: Create a dedicated super admin connection with the JWT
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: superAdmin.token.access,
    },
  };
  // Step 4: Attempt to retrieve a customer with a non-existent UUID
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 when super admin retrieves non-existent customer",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.customers.at(
        superAdminConnection,
        {
          customerId: nonExistentCustomerId,
        },
      );
    },
  );
}
