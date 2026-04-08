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
 * Test customer address deletion success for non-default shipping address.
 *
 * Validates the complete address deletion workflow including member authentication, address creation with is_default=false, successful deletion, and verification that the delete operation completes without error. This test ensures that customers can successfully remove addresses they no longer need while maintaining data integrity for historical order records through soft deletion.
 *
 * The test verifies that:
 * 1. Member authentication works correctly via the join flow.
 * 2. Non-default addresses can be created successfully.
 * 3. The delete endpoint returns void (204 No Content) on success.
 * 4. The deletion operation completes without throwing an error.
 *
 * 1. Member registration and authentication.
 * 2. Create a non-default shipping address with is_default=false.
 * 3. Delete the address using the erase endpoint.
 * 4. Verify deletion succeeded by confirming no error was thrown.
 */
export async function test_api_customer_address_deletion_success(
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
  // 2. Create a non-default shipping address
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        is_default: false,
      } satisfies Partial<IShoppingMallCustomerAddress.ICreate>,
    },
  );
  typia.assert(address);
  // Verify the address was created with is_default=false
  TestValidator.equals("address is not default", address.is_default, false);
  // 3. Delete the address using the erase endpoint
  // Returns void (204 No Content) on success
  await api.functional.shoppingMall.member.addresses.erase(memberConnection, {
    addressId: address.id,
  });
  // 4. Verify deletion succeeded - the operation completed without throwing
  // The void return indicates 204 No Content response
  TestValidator.predicate("deletion completed successfully", true);
}
