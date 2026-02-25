import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_me_addresses_create } from "../../../generate/generate_random_ecommerce_customer_me_addresses_create";
import { prepare_random_ecommerce_customer_address } from "../../../prepare/prepare_random_ecommerce_customer_address";

export async function test_api_customer_address_creation_canadian_postal_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@example.com",
      password: "TestPass123!",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  // 2. Create address with valid Canadian postal code
  const address = await generate_random_ecommerce_customer_me_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        street_address: "123 Main St",
        city: "Toronto",
        state: "ON",
        postal_code: "M5G 2T6",
        country: "Canada",
      },
    },
  );
  // 3. Validate Canadian postal code format
  typia.assert(address);
  TestValidator.equals(
    "Postal code should match input format",
    address.postal_code,
    "M5G 2T6",
  );
}
