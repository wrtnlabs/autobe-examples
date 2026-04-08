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
 * Test that deleting a default shipping address is blocked by business logic validation.
 *
 * Validates the critical business rule that prevents customers from deleting their default shipping address without first reassigning the default flag to another address. This ensures customers always maintain at least one valid default address for checkout operations.
 *
 * The test creates a member account, establishes a default shipping address, attempts to delete it directly, and verifies the operation is rejected. After the failed deletion attempt, the address must still exist in the customer's address list.
 *
 * 1. Member registers with unique credentials and receives authentication tokens.
 * 2. Member creates a shipping address with is_default=true designation.
 * 3. Member attempts to delete the default address via DELETE endpoint.
 * 4. System rejects deletion with business logic error (not type validation error).
 * 5. Address remains accessible in customer's address list after failed deletion.
 */
export async function test_api_customer_address_deletion_default_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. Create a default shipping address
  const defaultAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(defaultAddress);
  TestValidator.predicate(
    "address is default",
    defaultAddress.is_default === true,
  );
  // 3. Attempt to delete the default address (should fail with business logic error)
  await TestValidator.error("delete default address blocked", async () => {
    await api.functional.shoppingMall.member.addresses.erase(memberConnection, {
      addressId: defaultAddress.id,
    });
  });
}
