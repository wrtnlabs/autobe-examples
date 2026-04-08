import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_addresses_create } from "../../../generate/generate_random_ecommerce_customer_addresses_create";
import { prepare_random_ecommerce_address } from "../../../prepare/prepare_random_ecommerce_address";

/**
 * Test setting a shipping address as the customer's default address.
 *
 * Validates the default address constraint enforcement when updating an address to be the customer's default. When the is_default flag is set to true on an address, the system must automatically unset the default status on the customer's previous default address to maintain the one-default-per-customer constraint.
 *
 * This test ensures that after updating an address to be default, the previously default address is no longer marked as default, and the newly updated address is correctly marked as default. The constraint is verified by fetching both addresses and validating their is_default states.
 *
 * 1. Customer authenticates via join endpoint.
 * 2. First shipping address created with is_default=true.
 * 3. Second shipping address created with is_default=false.
 * 4. Validates first address is initially marked as default.
 * 5. Validates second address is initially not marked as default.
 * 6. Second address updated to set is_default=true.
 * 7. Validates response shows second address now has is_default=true.
 * 8. Fetches first address and verifies it now has is_default=false.
 */
export async function test_api_address_update_set_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Create first address with is_default=true
  const firstAddress: IEcommerceAddress =
    await generate_random_ecommerce_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  // 3. Create second address with is_default=false
  const secondAddress: IEcommerceAddress =
    await generate_random_ecommerce_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address not default",
    secondAddress.is_default,
    false,
  );
  // 4. Update second address to set is_default=true
  const updatedSecondAddress: IEcommerceAddress =
    await api.functional.ecommerce.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: {
          is_default: true,
        } satisfies IEcommerceAddress.IUpdate,
      },
    );
  typia.assert(updatedSecondAddress);
  // 5. Validate updated address is now default
  TestValidator.equals(
    "updated address is default",
    updatedSecondAddress.is_default,
    true,
  );
  // 6. Fetch first address again to verify constraint enforcement
  const refreshedFirstAddress: IEcommerceAddress =
    await api.functional.ecommerce.customer.addresses.update(
      customerConnection,
      {
        addressId: firstAddress.id,
        body: {},
      },
    );
  typia.assert(refreshedFirstAddress);
  // 7. Validate first address is no longer default (constraint enforced)
  TestValidator.equals(
    "previous default address unset",
    refreshedFirstAddress.is_default,
    false,
  );
}
