import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPassword = RandomGenerator.alphaNumeric(16);
  const customerAName = RandomGenerator.name();
  const customerAPhone = RandomGenerator.mobile();
  const customerAAuthorized = await authorize_customer_join(
    customerAConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(customerAEmail),
        password: customerAPassword,
        name: customerAName,
        phone: customerAPhone,
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerAAuthorized);
  // 2. Register Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = RandomGenerator.alphaNumeric(16);
  const customerBName = RandomGenerator.name();
  const customerBPhone = RandomGenerator.mobile();
  const customerBAuthorized = await authorize_customer_join(
    customerBConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(customerBEmail),
        password: customerBPassword,
        name: customerBName,
        phone: customerBPhone,
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerBAuthorized);
  // 3. Authenticate Customer A
  const customerALoginConnection: api.IConnection = { host: connection.host };
  const customerALoginAuthorized = await authorize_customer_login(
    customerALoginConnection,
    {
      body: {
        email: customerAEmail,
        password: customerAPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerALoginAuthorized);
  // 4. Get Customer A's profile
  const customerAProfile =
    await api.functional.ecommerceMall.customer.customers.me.at(
      customerALoginConnection,
    );
  typia.assert(customerAProfile);
  // 5. Verify privacy isolation
  TestValidator.equals(
    "profile user_id matches Customer A",
    customerAProfile.user_id,
    customerAAuthorized.customer.id,
  );
  TestValidator.equals(
    "profile display_name matches Customer A",
    customerAProfile.display_name,
    customerAName,
  );
  TestValidator.equals(
    "profile phone_number matches Customer A",
    customerAProfile.phone_number,
    customerAPhone,
  );
  TestValidator.notEquals(
    "profile does not contain Customer B data",
    customerAProfile.user_id,
    customerBAuthorized.customer.id,
  );
  TestValidator.notEquals(
    "profile display_name not from Customer B",
    customerAProfile.display_name,
    customerBName,
  );
  TestValidator.notEquals(
    "profile phone_number not from Customer B",
    customerAProfile.phone_number,
    customerBPhone,
  );
}