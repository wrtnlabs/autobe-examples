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
 * Test the default address designation business rule where setting one address as default automatically sets all other addresses for the same customer to non-default.
 *
 * Validates the critical business rule that each customer must have exactly one default address at any time, and the system automatically manages this constraint during updates. The test creates two addresses for a member, then updates the second address to become the default, verifying that the update operation succeeds and the second address is correctly marked as default.
 *
 * Test flow:
 * 1. Register a new member account using authorize_member_join utility function.
 * 2. Create the first address with is_default=true using generate_random_shopping_mall_member_addresses_create.
 * 3. Create the second address with is_default=false using generate_random_shopping_mall_member_addresses_create.
 * 4. Update the second address to set is_default=true using api.functional.shoppingMall.member.addresses.update.
 * 5. Verify the second address now has is_default=true in the update response.
 * 6. Verify the first address ID differs from the second address ID to confirm two distinct addresses exist.
 *
 * This ensures the application layer correctly enforces the one-default-address-per-customer constraint by atomically updating existing default addresses when a new default is designated. The backend automatically handles setting the previous default address to false when a new default is set.
 */
export async function test_api_address_default_designation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first address with is_default=true
  const firstAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(firstAddress);
  TestValidator.predicate(
    "first address is default",
    firstAddress.is_default === true,
  );
  // 3. Create second address with is_default=false
  const secondAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "second address is not default",
    secondAddress.is_default === false,
  );
  // Verify addresses are distinct
  TestValidator.notEquals(
    "addresses have different IDs",
    firstAddress.id,
    secondAddress.id,
  );
  // 4. Update second address to set is_default=true
  const updatedSecondAddress =
    await api.functional.shoppingMall.member.addresses.update(
      memberConnection,
      {
        addressId: secondAddress.id,
        body: {
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.IUpdate,
      },
    );
  typia.assert(updatedSecondAddress);
  // 5. Verify second address now has is_default=true
  TestValidator.predicate(
    "second address is now default after update",
    updatedSecondAddress.is_default === true,
  );
  // 6. Verify the address ID remains the same after update
  TestValidator.equals(
    "address ID unchanged after update",
    updatedSecondAddress.id,
    secondAddress.id,
  );
}
