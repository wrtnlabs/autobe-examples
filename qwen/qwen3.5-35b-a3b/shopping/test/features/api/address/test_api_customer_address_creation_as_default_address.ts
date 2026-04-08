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
 * Test customer address creation with default flag enabled for first address.
 *
 * Validates the complete workflow for creating a customer's first shipping address and marking it as the default. The test ensures that the address creation process properly handles the is_default flag, generates appropriate timestamps, and maintains data integrity for the customer relationship.
 *
 * Special attention is given to verifying that the default address constraint is properly enforced and that the address is immediately available for use in subsequent order operations.
 *
 * 1. Customer registers with valid credentials and receives authentication tokens.
 * 2. Customer creates a new shipping address with is_default=true.
 * 3. Validates all address fields match the input data exactly.
 * 4. Confirms the is_default flag is set to true in the response.
 * 5. Verifies auto-generated fields: id (UUID), created_at, updated_at timestamps.
 * 6. Ensures deleted_at is NULL for the active address.
 * 7. Validates the customer field contains correct summary data.
 */
export async function test_api_customer_address_creation_as_default_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer with valid credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const member: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Prepare address data before API call
  const recipientName: string = RandomGenerator.name();
  const phone: string = RandomGenerator.mobile();
  const street: string = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<99999>>()} Main Street`;
  const city: string = RandomGenerator.name(2);
  const state: string = RandomGenerator.name(2);
  const postalCode: string = RandomGenerator.alphaNumeric(10);
  const country: string = "United States";
  // 3. Create customer's first address with is_default=true
  const address: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: recipientName,
          phone: phone,
          street: street,
          city: city,
          state: state,
          postal_code: postalCode,
          country: country,
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Validate address fields match input
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    recipientName,
  );
  TestValidator.equals("phone matches", address.phone, phone);
  TestValidator.equals("street matches", address.street, street);
  TestValidator.equals("city matches", address.city, city);
  TestValidator.equals("state matches", address.state, state);
  TestValidator.equals("postal code matches", address.postal_code, postalCode);
  TestValidator.equals("country matches", address.country, country);
  // 5. Validate is_default is true
  TestValidator.equals("is_default is true", address.is_default, true);
  // 6. Validate auto-generated id (UUID format)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate("id is valid UUID", uuidPattern.test(address.id));
  // 7. Validate timestamps are ISO 8601 date-time format
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/;
  TestValidator.predicate(
    "created_at is valid date-time",
    dateTimePattern.test(address.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    dateTimePattern.test(address.updated_at),
  );
  // 8. Validate deleted_at is NULL for active address
  TestValidator.equals("deleted_at is NULL", address.deleted_at, null);
  // 9. Validate customer field contains correct summary
  TestValidator.equals("customer id matches", address.customer.id, member.id);
  TestValidator.equals(
    "customer email matches",
    address.customer.email,
    member.email,
  );
  TestValidator.equals(
    "customer display_name matches",
    address.customer.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "customer phone_number matches",
    address.customer.phone_number,
    member.phone_number,
  );
}
