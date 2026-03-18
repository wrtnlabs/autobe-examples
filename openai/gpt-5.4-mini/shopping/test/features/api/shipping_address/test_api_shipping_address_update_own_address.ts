import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_update_own_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorization);
  const body = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "Korea",
    isDefault: false,
  } satisfies IShoppingMallShippingAddress.IUpdate;
  const output =
    await api.functional.shoppingMall.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "recipient name echoes request",
    output.recipientName,
    body.recipientName,
  );
  TestValidator.equals(
    "phone number echoes request",
    output.phoneNumber,
    body.phoneNumber,
  );
  TestValidator.equals(
    "street address echoes request",
    output.streetAddress,
    body.streetAddress,
  );
  TestValidator.equals("city echoes request", output.city, body.city);
  TestValidator.equals(
    "state/province echoes request",
    output.stateProvince,
    body.stateProvince,
  );
  TestValidator.equals(
    "postal code echoes request",
    output.postalCode,
    body.postalCode,
  );
  TestValidator.equals("country echoes request", output.country, body.country);
  TestValidator.equals(
    "default flag echoes request",
    output.isDefault,
    body.isDefault,
  );
}
