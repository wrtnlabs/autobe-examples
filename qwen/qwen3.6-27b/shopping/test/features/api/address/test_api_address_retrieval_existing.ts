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

export async function test_api_address_retrieval_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account for authentication context
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies DeepPartial<IEcommercePlatformCustomer.IJoin>;
  await authorize_customer_join(customerConnection, { body: joinBody });
  // 2. Create a shipping address with default flag explicitly set to false
  const createBody = {
    recipientName: RandomGenerator.name(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.paragraph({ sentences: 1 }),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    isDefault: false,
  } satisfies DeepPartial<IEcommercePlatformShippingAddress.ICreate>;
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(address);
  // 3. Retrieve the created address using its unique identifier
  const retrievedAddress =
    await api.functional.ecommercePlatform.customer.addresses.at(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate address retrieval matches creation inputs
  TestValidator.equals(
    "recipient_name matches",
    retrievedAddress.recipient_name,
    createBody.recipientName,
  );
  TestValidator.equals(
    "street_address matches",
    retrievedAddress.street_address,
    createBody.streetAddress,
  );
  TestValidator.equals("city matches", retrievedAddress.city, createBody.city);
  TestValidator.equals(
    "state matches",
    retrievedAddress.state,
    createBody.state,
  );
  TestValidator.equals(
    "postal_code matches",
    retrievedAddress.postal_code,
    createBody.postalCode,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    createBody.country,
  );
  TestValidator.equals(
    "is_default is explicitly false",
    retrievedAddress.is_default,
    false,
  );
  TestValidator.predicate(
    "customerProfile is populated",
    retrievedAddress.customerProfile != null,
  );
  TestValidator.predicate(
    "customerProfile has id",
    retrievedAddress.customerProfile.id.length > 0,
  );
  TestValidator.predicate(
    "customerProfile has display_name",
    retrievedAddress.customerProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "customerProfile has customer reference",
    retrievedAddress.customerProfile.customer != null,
  );
  TestValidator.predicate(
    "address has valid created_at timestamp",
    retrievedAddress.created_at.length > 0,
  );
  TestValidator.predicate(
    "address has valid updated_at timestamp",
    retrievedAddress.updated_at.length > 0,
  );
}