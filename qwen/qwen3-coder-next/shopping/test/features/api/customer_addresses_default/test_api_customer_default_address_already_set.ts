import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_default_address_already_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and registers
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Update connection with authorization token from registration
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: auth.token.access,
  };
  // 2. Create a test address using the auth customer's session
  // Since there's no explicit address creation endpoint in the SDK,
  // we'll simulate the default address setting with a placeholder address ID
  // For a real test, address creation would happen through customer registration
  // or a dedicated endpoint not shown in the provided API functions.
  // 3. Set a placeholder address as default (first time)
  // Using a random UUID as placeholder since we can't create a real address
  const placeholderAddressId = typia.random<string & tags.Format<"uuid">>();
  const defaulted =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: placeholderAddressId,
        body: {},
      },
    );
  typia.assert(defaulted);
  TestValidator.equals("first default set", defaulted.is_default, true);
  TestValidator.equals("correct address", defaulted.id, placeholderAddressId);
  // 4. Set the same address as default again (already-default case)
  const reDefaulted =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: placeholderAddressId,
        body: {},
      },
    );
  typia.assert(reDefaulted);
  TestValidator.equals("re-default remains true", reDefaulted.is_default, true);
  TestValidator.equals(
    "same address returned",
    reDefaulted.id,
    placeholderAddressId,
  );
}
