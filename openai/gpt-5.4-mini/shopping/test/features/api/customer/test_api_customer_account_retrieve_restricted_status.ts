import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_account_retrieve_restricted_status(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const customer = await api.functional.mallPlatform.administrator.customers.at(
    adminConnection,
    {
      customerId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(customer);
  TestValidator.predicate(
    "customer id should be present",
    customer.id.length > 0,
  );
  TestValidator.predicate(
    "customer email should be present",
    customer.email.length > 0,
  );
  TestValidator.predicate(
    "customer status should be readable",
    customer.status.length > 0,
  );
  TestValidator.predicate(
    "customer timestamps should be readable",
    customer.createdAt.length > 0 && customer.updatedAt.length > 0,
  );
}
