import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a separate connection for the first customer to join
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  // Generate a random email
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd12345678";
  // Register the first customer with the generated email
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: { email, password },
  });
  typia.assert(firstCustomer);
  // Now attempt to register another customer with the same email
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email rejection", async () => {
    await authorize_customer_join(secondCustomerConnection, {
      body: { email, password },
    });
  });
}
