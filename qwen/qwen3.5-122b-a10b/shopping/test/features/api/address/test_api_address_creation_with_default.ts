import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

/**
 * Test customer address creation with default designation.
 * 1. Register a new customer account
 * 2. Create customer-specific connection
 * 3. Create new shipping address with is_default=true
 * 4. Validate response includes all required fields
 * 5. Verify isDefault flag is true
 * 6. Verify customer relation is linked correctly
 * 7. Verify timestamps are recorded
 */
export async function test_api_address_creation_with_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const authorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(authorized);
  // 2. Create customer connection for address operations
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 3. Create address with is_default=true
  const address: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(2),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<10>
          >(),
          country: RandomGenerator.name(1),
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Validate response fields
  TestValidator.equals(
    "address ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      address.id,
    ),
    true,
  );
  TestValidator.predicate(
    "recipient name present",
    address.recipientName.length > 0,
  );
  TestValidator.predicate("phone number present", address.phoneNumber.length > 0);
  TestValidator.predicate(
    "street address present",
    address.streetAddress.length > 0,
  );
  TestValidator.predicate("city present", address.city.length > 0);
  TestValidator.predicate(
    "state province present",
    address.stateProvince.length > 0,
  );
  TestValidator.predicate("postal code present", address.postalCode.length > 0);
  TestValidator.predicate("country present", address.country.length > 0);
  // 5. Verify isDefault is true
  TestValidator.equals("isDefault flag is true", address.isDefault, true);
  // 6. Verify customer relation
  TestValidator.equals(
    "customer ID matches",
    address.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email matches",
    address.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer display_name matches",
    address.customer.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "customer phone_number matches",
    address.customer.phone_number,
    authorized.phone_number,
  );
  // 7. Verify timestamps
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      address.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      address.updatedAt,
    ),
  );
  TestValidator.equals("deletedAt is null", address.deletedAt, null);
}