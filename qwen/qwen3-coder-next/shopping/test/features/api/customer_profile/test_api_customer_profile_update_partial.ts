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

export async function test_api_customer_profile_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    password: "12345678",
    display_name: "Initial Name",
    phone_number: "01012345678",
    href: "https://example.com/register",
    referrer: "https://example.com",
    ip: "127.0.0.1",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorizedCustomer);
  // Update connection with authentication token
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: authorizedCustomer.token.access,
  };
  // Test: Update only display_name, leave phone_number as null
  const updateData = {
    display_name: "Updated Name",
    phone_number: null,
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedCustomer =
    await api.functional.shoppingMall.customer.customers.profile.updateProfile(
      customerConnection,
      {
        body: updateData,
      },
    );
  typia.assert(updatedCustomer);
  // Validate: Check that display_name was updated and phone_number is null
  TestValidator.equals(
    "display_name updated",
    updatedCustomer.display_name,
    "Updated Name",
  );
  TestValidator.equals("phone_number null", updatedCustomer.phone_number, null);
  TestValidator.equals(
    "email unchanged",
    updatedCustomer.email,
    customerData.email,
  );
  TestValidator.predicate(
    "created_at exists",
    updatedCustomer.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedCustomer.updated_at !== undefined,
  );
  TestValidator.equals(
    "email_verified unchanged",
    updatedCustomer.email_verified,
    true,
  );
}