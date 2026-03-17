import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_shipping_address_create_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const body = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const address =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body,
      },
    );
  typia.assert(address);
  TestValidator.predicate(
    "address id should be created",
    address.id.length > 0,
  );
  TestValidator.equals(
    "recipient name is persisted",
    address.recipient_name,
    body.recipient_name,
  );
  TestValidator.equals(
    "phone number is persisted",
    address.phone_number,
    body.phone_number,
  );
  TestValidator.equals(
    "street address is persisted",
    address.street_address,
    body.street_address,
  );
  TestValidator.equals("city is persisted", address.city, body.city);
  TestValidator.equals(
    "state or province is persisted",
    address.state_province,
    body.state_province,
  );
  TestValidator.equals(
    "postal code is persisted",
    address.postal_code,
    body.postal_code,
  );
  TestValidator.equals("country is persisted", address.country, body.country);
  TestValidator.equals(
    "default flag is persisted",
    address.is_default,
    body.is_default,
  );
}
