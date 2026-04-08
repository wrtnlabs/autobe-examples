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
 * Test address update ownership verification to ensure customers can only modify their own addresses.
 *
 * Validates the security business rule that prevents customers from updating addresses owned by other customers. This test ensures proper isolation of customer data and access control enforcement at the API level.
 *
 * The test creates two separate member accounts, establishes an address under the first customer's account, then attempts to modify that address while authenticated as the second customer. The expected behavior is a 403 Forbidden error due to ownership mismatch.
 *
 * 1. Register customer A with unique credentials and establish authenticated connection.
 * 2. Register customer B with different unique credentials and establish separate authenticated connection.
 * 3. Create a shipping address under customer A's account using their connection.
 * 4. Attempt to update customer A's address using customer B's authenticated connection.
 * 5. Verify the update operation fails with authorization error, confirming ownership verification is enforced.
 * 6. Verify customer A can still successfully update their own address (positive control test).
 */
export async function test_api_address_update_ownership_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A (address owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(customerA);
  // 2. Register customer B (attempted unauthorized updater)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(customerB);
  // 3. Create address under customer A's account
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(addressA);
  // 4. Verify customer B cannot update customer A's address
  await TestValidator.error(
    "customer B cannot update customer A's address - ownership verification",
    async () => {
      await api.functional.shoppingMall.member.addresses.update(
        customerBConnection,
        {
          addressId: addressA.id,
          body: {
            recipient_name: RandomGenerator.name(),
          } satisfies IShoppingMallCustomerAddress.IUpdate,
        },
      );
    },
  );
  // 5. Verify customer A can still update their own address (positive test)
  const updatedAddress =
    await api.functional.shoppingMall.member.addresses.update(
      customerAConnection,
      {
        addressId: addressA.id,
        body: {
          recipient_name: RandomGenerator.name(),
        } satisfies IShoppingMallCustomerAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.notEquals(
    "recipient name should be updated",
    addressA.recipient_name,
    updatedAddress.recipient_name,
  );
  TestValidator.equals(
    "address ID remains the same",
    addressA.id,
    updatedAddress.id,
  );
}
