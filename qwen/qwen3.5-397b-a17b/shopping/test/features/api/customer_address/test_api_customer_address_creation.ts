import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_customer_address_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. Create a new shipping address with all required fields
  const addressInput: IShoppingMallAddress.ICreate = {
    recipientName: RandomGenerator.name(),
    recipientPhone: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    state: RandomGenerator.name(),
    postalCode: typia.random<string>(),
    country: RandomGenerator.name(),
    isDefault: false,
  };
  const address: IShoppingMallAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: addressInput,
      },
    );
  typia.assert(address);
  // 4. Validate address was created successfully
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    addressInput.recipientName,
  );
  TestValidator.equals(
    "recipient phone matches",
    address.recipient_phone,
    addressInput.recipientPhone,
  );
  TestValidator.equals(
    "street address matches",
    address.street_address,
    addressInput.streetAddress,
  );
  TestValidator.equals("city matches", address.city, addressInput.city);
  TestValidator.equals("state matches", address.state, addressInput.state);
  TestValidator.equals(
    "postal code matches",
    address.postal_code,
    addressInput.postalCode,
  );
  TestValidator.equals(
    "country matches",
    address.country,
    addressInput.country,
  );
  TestValidator.equals("is_default is false", address.is_default, false);
  TestValidator.equals(
    "customer ID matches",
    address.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    address.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "address has valid UUID",
    /^[0-9a-f-]{36}$/i.test(address.id),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(address.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(address.updated_at)),
  );
  TestValidator.equals("deleted_at is null", address.deleted_at, null);
}
