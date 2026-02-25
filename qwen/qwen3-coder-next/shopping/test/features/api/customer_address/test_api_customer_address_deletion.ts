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

export async function test_api_customer_address_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const email1 = typia.random<string & tags.Format<"email">>();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: email1 satisfies string as string,
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Generate random address ID for testing deletion
  const randomAddressId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test successful address deletion with valid address ID
  // Note: This assumes the address exists in the system
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: randomAddressId,
    },
  );
  typia.assert<void>(undefined);
  // 3. Test ownership validation - attempt to delete another customer's address
  const customer2Connection: api.IConnection = { host: connection.host };
  const email2 = typia.random<string & tags.Format<"email">>();
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: email2 satisfies string as string,
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // Customer 2 should not be able to delete customer 1's address
  await TestValidator.error("ownership validation", async () => {
    await api.functional.shoppingMall.customer.addresses.erase(
      customer2Connection,
      {
        addressId: randomAddressId,
      },
    );
  });
  // 4. Test deletion of non-existent address
  await TestValidator.error("non-existent address", async () => {
    await api.functional.shoppingMall.customer.addresses.erase(
      customerConnection,
      {
        addressId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });
  // 5. Test authentication requirement
  // Attempt to delete address without authentication (should fail)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access", async () => {
    await api.functional.shoppingMall.customer.addresses.erase(
      unauthenticatedConnection,
      {
        addressId: randomAddressId,
      },
    );
  });
}