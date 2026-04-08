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

export async function test_api_address_update_set_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
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
  typia.assert(memberAuth);
  // 2. Create two addresses: first as default, second not default
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // Create first address as default
  const firstAddress =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: "South Korea",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // Create second address not as default
  const secondAddress =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: "South Korea",
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  // Verify initial state: first address is default, second is not
  TestValidator.equals("first address default", firstAddress.is_default, true);
  TestValidator.equals(
    "second address not default",
    secondAddress.is_default,
    false,
  );
  // 3. Update the second address with new recipient name and is_default=true
  const newRecipientName = RandomGenerator.name();
  const updateBody = {
    recipient_name: newRecipientName,
    is_default: true,
  } satisfies IEcommerceMallCustomerAddress.IUpdate;
  const updatedAddress =
    await api.functional.ecommerceMall.member.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 4. Verify the update succeeds and response contains modified fields
  TestValidator.equals(
    "updated recipient name",
    updatedAddress.recipient_name,
    newRecipientName,
  );
  TestValidator.equals(
    "updated address is default",
    updatedAddress.is_default,
    true,
  );
  TestValidator.equals(
    "address id unchanged",
    updatedAddress.id,
    secondAddress.id,
  );
  TestValidator.predicate(
    "updated_at updated",
    updatedAddress.updated_at !== secondAddress.updated_at,
  );
  // 5. Verify the first address is automatically reset (is_default=false)
  TestValidator.equals(
    "first address not default after second set",
    firstAddress.is_default,
    false,
  );
  // 6. Verify the updated address details are preserved for non-updated fields
  TestValidator.equals(
    "original street preserved",
    updatedAddress.street,
    secondAddress.street,
  );
  TestValidator.equals(
    "original phone preserved",
    updatedAddress.phone,
    secondAddress.phone,
  );
  TestValidator.equals(
    "original city preserved",
    updatedAddress.city,
    secondAddress.city,
  );
  TestValidator.equals(
    "original state preserved",
    updatedAddress.state,
    secondAddress.state,
  );
  TestValidator.equals(
    "original postal code preserved",
    updatedAddress.postal_code,
    secondAddress.postal_code,
  );
  TestValidator.equals(
    "original country preserved",
    updatedAddress.country,
    secondAddress.country,
  );
}
