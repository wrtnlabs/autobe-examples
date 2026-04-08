import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

/**
 * Create a saved shipping address for the authenticated customer.
 *
 * Validates that shipping address creation is performed under the signed-in customer session and that the API persists and returns the submitted delivery profile fields exactly as created.
 *
 * 1. Registers a new customer account to obtain authenticated access.
 * 2. Creates a shipping address using the authenticated customer connection.
 * 3. Verifies the persisted address matches the submitted recipient and delivery location data.
 * 4. Confirms ownership is bound to the authenticated customer account.
 */
export async function test_api_shipping_address_create_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const body = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.name(1),
  } satisfies IMallPlatformShippingAddress.ICreate;
  const created =
    await api.functional.mallPlatform.customer.shipping_addresses.create(
      customerConnection,
      { body },
    );
  typia.assert(created);
  TestValidator.equals(
    "customer ownership",
    created.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email ownership",
    created.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "recipient name",
    created.recipientName,
    body.recipientName,
  );
  TestValidator.equals("phone number", created.phoneNumber, body.phoneNumber);
  TestValidator.equals(
    "street address",
    created.streetAddress,
    body.streetAddress,
  );
  TestValidator.equals("city", created.city, body.city);
  TestValidator.equals(
    "state province",
    created.stateProvince,
    body.stateProvince,
  );
  TestValidator.equals("postal code", created.postalCode, body.postalCode);
  TestValidator.equals("country", created.country, body.country);
  TestValidator.predicate("address record created", created.id.length > 0);
}
