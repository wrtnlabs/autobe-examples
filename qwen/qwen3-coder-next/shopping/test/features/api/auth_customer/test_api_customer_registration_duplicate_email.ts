import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a customer with a unique email
  const initialCustomerEmail = typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>());
  const initialCustomerPassword = "12345678";
  const initialCustomerConnection: api.IConnection = { host: connection.host };
  const initialCustomer = await authorize_customer_join(
    initialCustomerConnection,
    {
      body: {
        email: initialCustomerEmail,
        password: initialCustomerPassword,
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(initialCustomer);
  // Step 2: Attempt to register another customer with the same email (should fail)
  const duplicateCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_customer_join(duplicateCustomerConnection, {
        body: {
          email: initialCustomerEmail,
          password: "87654321",
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          href: "https://example.com/join2",
          referrer: "https://example.com/referrer2",
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
}