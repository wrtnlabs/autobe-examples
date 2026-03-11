import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_system_config_deletion_restricted_to_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Step 2: Log in as the customer
  const loginResponse = await api.functional.ecommerceMall.auth.customer.login(
    customerConnection,
    {
      body: {
        email: joinResponse.customer.email,
        password: "password123",
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(loginResponse);
  // Step 3: Attempt to delete system configuration with customer token (should fail)
  const configId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "customer should not be able to delete system config",
    async () => {
      await api.functional.ecommerceMall.admin.system_configurations.erase(
        customerConnection,
        {
          configurationId: configId,
        },
      );
    },
  );
}