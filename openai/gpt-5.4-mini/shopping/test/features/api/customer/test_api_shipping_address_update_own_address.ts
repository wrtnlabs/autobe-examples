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

export async function test_api_shipping_address_update_own_address(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a customer can update their own saved shipping address.
   *
   * This test covers the full address-edit workflow for an authenticated customer, including address creation, update of all editable delivery fields, and validation that the record remains linked to the same owner after the change.
   *
   * 1. Register a customer and establish an authenticated customer connection.
   * 2. Create a saved shipping address for that customer.
   * 3. Update the address with new recipient and location values.
   * 4. Confirm the updated response preserves ownership and active status while reflecting the edited delivery fields.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
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
          country: "Korea",
          is_default: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(created);
  const updateBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(10),
    country: "United States",
  } satisfies IMallPlatformShippingAddress.IUpdate;
  const updated =
    await api.functional.mallPlatform.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("shipping address id preserved", updated.id, created.id);
  TestValidator.equals(
    "customer ownership preserved",
    updated.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email preserved",
    updated.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "recipient name updated",
    updated.recipientName,
    updateBody.recipientName,
  );
  TestValidator.equals(
    "phone number updated",
    updated.phoneNumber,
    updateBody.phoneNumber,
  );
  TestValidator.equals(
    "street address updated",
    updated.streetAddress,
    updateBody.streetAddress,
  );
  TestValidator.equals("city updated", updated.city, updateBody.city);
  TestValidator.equals(
    "state/province updated",
    updated.stateProvince,
    updateBody.stateProvince,
  );
  TestValidator.equals(
    "postal code updated",
    updated.postalCode,
    updateBody.postalCode,
  );
  TestValidator.equals("country updated", updated.country, updateBody.country);
  TestValidator.equals("address remains active", updated.deletedAt, null);
}
