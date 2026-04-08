import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test customer shipping address creation workflow with member authentication.
 *
 * Validates the complete address creation flow including member registration, authentication, and address creation with all required fields. Ensures that the address is properly associated with the customer profile and that all system-managed fields are correctly populated.
 *
 * Special attention is given to verifying that the customerProfile relation is correctly established, all address components are preserved in the response, and the soft-delete field (deleted_at) is null indicating active status.
 *
 * 1. Member registers with unique email and credentials using authorize_member_join utility.
 * 2. Creates a new connection with the authentication token from registration response.
 * 3. Creates a shipping address with all required fields and is_default set to false.
 * 4. Validates the response contains generated id, all provided address fields match input, customerProfile relation, and timestamps.
 * 5. Verifies deleted_at is null indicating the address is active.
 */
export async function test_api_customer_address_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Prepare address input data
  const addressInput = {
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia.random<string>(),
    country: "US",
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  // 4. Create shipping address with all required fields
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: addressInput,
    },
  );
  typia.assert(address);
  // 5. Validate address fields match input
  TestValidator.equals(
    "recipient name matches input",
    address.recipient_name,
    addressInput.recipient_name,
  );
  TestValidator.equals(
    "recipient phone matches input",
    address.recipient_phone,
    addressInput.recipient_phone,
  );
  TestValidator.equals(
    "street address matches input",
    address.street_address,
    addressInput.street_address,
  );
  TestValidator.equals("city matches input", address.city, addressInput.city);
  TestValidator.equals(
    "state province matches input",
    address.state_province,
    addressInput.state_province,
  );
  TestValidator.equals(
    "postal code matches input",
    address.postal_code,
    addressInput.postal_code,
  );
  TestValidator.equals(
    "country matches input",
    address.country,
    addressInput.country,
  );
  TestValidator.equals(
    "is_default matches input",
    address.is_default,
    addressInput.is_default,
  );
  // 6. Validate system-generated fields
  TestValidator.predicate(
    "id is valid uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      address.id,
    ),
  );
  TestValidator.equals("deleted_at is null (active)", address.deleted_at, null);
  // 7. Validate customerProfile relation exists and has required fields
  TestValidator.predicate(
    "customerProfile exists",
    address.customerProfile !== null,
  );
  TestValidator.predicate(
    "customerProfile has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      address.customerProfile!.id,
    ),
  );
  TestValidator.predicate(
    "customerProfile has display_name",
    address.customerProfile!.display_name.length > 0,
  );
  TestValidator.predicate(
    "customerProfile has phone_number",
    address.customerProfile!.phone_number.length > 0,
  );
}
