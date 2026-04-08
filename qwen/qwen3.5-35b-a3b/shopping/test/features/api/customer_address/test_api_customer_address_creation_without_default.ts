import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Test customer address creation without marking as default.
 *
 * Validates the successful creation of a new shipping address for an authenticated customer,
 * ensuring that the address can be created with is_default explicitly set to false. The test
 * confirms that all address fields are properly stored, timestamps are generated, and the
 * customer reference is correctly maintained. This is a foundational test for the address
 * management workflow, as customers typically create multiple addresses before selecting
 * one as their default.
 *
 * 1. Customer registers with valid credentials and email.
 * 2. Customer creates a new shipping address with all required fields.
 * 3. Verifies that is_default is false in the response.
 * 4. Validates all address fields match the input values.
 * 5. Confirms auto-generated id, timestamps, and deleted_at NULL.
 * 6. Verifies the customer summary object contains correct identity data.
 */
export async function test_api_customer_address_creation_without_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create new connection for authenticated operations
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 3. Create first shipping address without marking as default
  const addressInput = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street: `${RandomGenerator.alphaNumeric(5)} Main Street`,
    city: RandomGenerator.alphabets(8),
    state: RandomGenerator.alphabets(6),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.alphabets(2).toUpperCase(),
    is_default: false,
  } satisfies IEcommerceMallCustomerAddress.ICreate;

  const address =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerConnection,
      {
        body: addressInput,
      },
    );
  typia.assert(address);
  // 4. Validate response data
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    addressInput.recipient_name,
  );
  TestValidator.equals("phone matches", address.phone, addressInput.phone);
  TestValidator.equals("street matches", address.street, addressInput.street);
  TestValidator.equals("city matches", address.city, addressInput.city);
  TestValidator.equals("state matches", address.state, addressInput.state);
  TestValidator.equals(
    "postal code matches",
    address.postal_code,
    addressInput.postal_code,
  );
  TestValidator.equals(
    "country matches",
    address.country,
    addressInput.country,
  );
  TestValidator.equals("is_default is false", address.is_default, false);
  // 5. Validate auto-generated fields
  typia.assert<string & tags.Format<"uuid">>(address.id);
  typia.assert<string & tags.Format<"date-time">>(address.created_at);
  typia.assert<string & tags.Format<"date-time">>(address.updated_at);
  TestValidator.equals("deleted_at is NULL", address.deleted_at, null);
  // 6. Validate customer reference
  typia.assert<IEcommerceMallMember.ISummary>(address.customer);
  TestValidator.equals(
    "customer id matches registered user",
    address.customer.id,
    joinResult.id,
  );
  TestValidator.equals(
    "customer email matches registration",
    address.customer.email,
    joinResult.email,
  );
  TestValidator.equals(
    "customer display_name matches registration",
    address.customer.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "customer phone_number matches registration",
    address.customer.phone_number,
    joinResult.phone_number,
  );
}