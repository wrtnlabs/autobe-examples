import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_shipping_addresses_create } from "../../../generate/generate_random_mall_platform_customer_shipping_addresses_create";
import { prepare_random_mall_platform_shipping_address } from "../../../prepare/prepare_random_mall_platform_shipping_address";

export async function test_api_customer_shipping_address_retrieve_own_address(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve a saved shipping address owned by the authenticated customer.
   *
   * Validates that a customer can create and then fetch their own shipping address,
   * preserving the full delivery destination record including ownership summary,
   * recipient details, location fields, default flag, and lifecycle timestamps.
   *
   * 1. Register a customer and authenticate with an isolated connection.
   * 2. Create a saved shipping address for that customer.
   * 3. Retrieve the address by ID through the customer shipping-address lookup.
   * 4. Verify the returned record matches the stored address and ownership data.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const created =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(8),
          country: "South Korea",
          is_default: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(created);
  const found =
    await api.functional.mallPlatform.customer.shipping_addresses.at(
      customerConnection,
      {
        shippingAddressId: created.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "shipping address id should match",
    found.id,
    created.id,
  );
  TestValidator.equals(
    "customer id should match owner",
    found.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email should match owner",
    found.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer status should match owner",
    found.customer.status,
    customer.status,
  );
  TestValidator.equals(
    "customer created time should match owner",
    found.customer.created_at,
    customer.created_at,
  );
  TestValidator.equals(
    "customer updated time should match owner",
    found.customer.updated_at,
    customer.updated_at,
  );
  TestValidator.equals(
    "customer deleted time should match owner",
    found.customer.deleted_at,
    customer.deleted_at,
  );
  TestValidator.equals(
    "recipient name should match",
    found.recipientName,
    created.recipientName,
  );
  TestValidator.equals(
    "phone number should match",
    found.phoneNumber,
    created.phoneNumber,
  );
  TestValidator.equals(
    "street address should match",
    found.streetAddress,
    created.streetAddress,
  );
  TestValidator.equals("city should match", found.city, created.city);
  TestValidator.equals(
    "state province should match",
    found.stateProvince,
    created.stateProvince,
  );
  TestValidator.equals(
    "postal code should match",
    found.postalCode,
    created.postalCode,
  );
  TestValidator.equals("country should match", found.country, created.country);
  TestValidator.equals(
    "default flag should match",
    found.isDefault,
    created.isDefault,
  );
  TestValidator.equals(
    "created timestamp should match",
    found.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "updated timestamp should match",
    found.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "deleted timestamp should match",
    found.deletedAt,
    created.deletedAt,
  );
}
