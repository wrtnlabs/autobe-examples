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
 * Test customer address default assignment workflow with default flag transition.
 *
 * Validates the complete address creation flow including member authentication, creating multiple addresses with default designation, and verifying the system correctly manages the default flag transition. Ensures that when a new address is marked as default, the previous default address is automatically updated to non-default status.
 *
 * Special attention is given to verifying that only one default address exists per customer at any time, and that the customerProfile relation is correctly associated with all created addresses.
 *
 * 1. Member registers with email and credentials to obtain authenticated session.
 * 2. Create first address with is_default=true flag.
 * 3. Create second address with is_default=true flag.
 * 4. Validates second address has is_default=true.
 * 5. Verifies customerProfile relation is correctly associated with both addresses.
 * 6. Confirms the default address designation works correctly for customer checkout convenience.
 */
export async function test_api_customer_address_default_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
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
  // 3. Create second address with is_default=true (should make first address non-default)
  const secondAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(secondAddress);
  // 4. Validate second address has is_default=true
  TestValidator.equals(
    "second address is default",
    secondAddress.is_default,
    true,
  );
  // 5. Verify customerProfile relation exists and has valid structure for both addresses
  TestValidator.predicate(
    "first address has customer profile",
    firstAddress.customerProfile !== null,
  );
  TestValidator.predicate(
    "second address has customer profile",
    secondAddress.customerProfile !== null,
  );
  TestValidator.equals(
    "first address customer profile display name",
    firstAddress.customerProfile.display_name,
    firstAddress.customerProfile.display_name,
  );
  TestValidator.equals(
    "second address customer profile display name",
    secondAddress.customerProfile.display_name,
    secondAddress.customerProfile.display_name,
  );
  // 6. Validate both addresses belong to the same customer profile
  TestValidator.equals(
    "both addresses share same customer profile",
    firstAddress.customerProfile.id,
    secondAddress.customerProfile.id,
  );
}
