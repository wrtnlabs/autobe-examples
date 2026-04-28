import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

export async function test_api_customer_set_default_idempotent(
  connection: api.IConnection,
) {
  // 1. Customer Authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com/register",
    },
  });
  // 2. Create a shipping address that is already the default
  const addressBody: IEcommercePlatformShippingAddress.ICreate = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.alphabets(5),
    state: RandomGenerator.alphabets(2),
    postalCode: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.alphabets(3),
    isDefault: true, // Explicitly set as default
  };
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: addressBody,
      },
    );
  typia.assert(address);
  // 3. Call setDefault again with the same addressId (Idempotency Test)
  const response =
    await api.functional.ecommercePlatform.customer.addresses._default.setDefault(
      customerConnection,
      {
        body: {
          addressId: address.id,
        } satisfies IEcommercePlatformShippingAddress.ISetDefault,
      },
    );
  typia.assert(response);
  // 4. Validation
  TestValidator.equals("idempotent address ID", response.id, address.id);
  TestValidator.equals(
    "idempotent is_default is true",
    response.is_default,
    true,
  );
  TestValidator.equals("idempotent address matches", response, address);
}
