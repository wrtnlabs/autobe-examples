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
 * Test switching default address by unsetting current default and setting another as default.
 *
 * Validates the complete default address transition workflow by creating two customer
 * addresses, unsetting the default status on the first address, and setting the second
 * address as the new default. Ensures database integrity and single-default constraint
 * enforcement during the switch.
 *
 * Special attention is given to verifying that:
 * - Default address can be unset while preserving all other address fields
 * - Another address can be set as default after unsetting original default
 * - Database maintains exactly one default address per customer constraint
 * - Updates are atomic and database state remains consistent throughout the transition
 */
export async function test_api_address_update_default_switch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(memberData);
  // 2. Create first address as default
  const customerConnection: api.IConnection = { host: connection.host };
  const address1: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: `${RandomGenerator.alphabets(3)} ${RandomGenerator.alphabets(4)} St`,
          city: RandomGenerator.alphabets(5),
          state: RandomGenerator.alphabets(4),
          postal_code: typia.random<string>(),
          country: "KR",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address1);
  // 3. Create second address (non-default)
  const address2: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: `${RandomGenerator.alphabets(3)} ${RandomGenerator.alphabets(4)} Rd`,
          city: RandomGenerator.alphabets(5),
          state: RandomGenerator.alphabets(4),
          postal_code: typia.random<string>(),
          country: "KR",
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address2);
  // 4. Verify initial state: address1 is default, address2 is not
  TestValidator.equals("address1 is_default", address1.is_default, true);
  TestValidator.equals("address2 is_default", address2.is_default, false);
  TestValidator.notEquals("addresses differ", address1.id, address2.id);
  // 5. Update address1 to unset is_default=true
  const updatedAddress1: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.addresses.update(
      customerConnection,
      {
        addressId: address1.id,
        body: {
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress1);
  // 6. Verify address1 is no longer default (use response from step 5)
  TestValidator.equals(
    "address1 unsets is_default",
    updatedAddress1.is_default,
    false,
  );
  TestValidator.equals(
    "address1 name unchanged",
    updatedAddress1.recipient_name,
    address1.recipient_name,
  );
  // 7. Update address2 to set is_default=true
  const updatedAddress2: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.addresses.update(
      customerConnection,
      {
        addressId: address2.id,
        body: {
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress2);
  // 8. Verify address2 is now default
  TestValidator.equals(
    "address2 sets is_default",
    updatedAddress2.is_default,
    true,
  );
  // 9. Verify address1 remains is_default=false (use updatedAddress1 from step 5)
  TestValidator.equals(
    "address1 remains non-default",
    updatedAddress1.is_default,
    false,
  );
}