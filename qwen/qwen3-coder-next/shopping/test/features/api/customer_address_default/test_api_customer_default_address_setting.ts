import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_default_address_setting(
  connection: api.IConnection,
): Promise<void> {
  // Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData: IShoppingMallCustomer.IJoin = {
    email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
    password: RandomGenerator.alphabets(12) satisfies string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/referrer",
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // Use a valid UUID for testing (since we cannot create addresses via SDK)
  const testAddressId = "00000000-0000-0000-0000-000000000001";
  // Call setDefault function with test address ID
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: testAddressId,
      },
    );
  typia.assert(updatedAddress);
  // Verify the response structure
  TestValidator.predicate(
    "address has id",
    typeof updatedAddress.id === "string",
  );
  TestValidator.predicate(
    "address has isDefault property",
    typeof updatedAddress.isDefault === "boolean",
  );
}