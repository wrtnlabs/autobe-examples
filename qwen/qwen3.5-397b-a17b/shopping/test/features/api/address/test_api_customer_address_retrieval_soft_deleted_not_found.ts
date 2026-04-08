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
 * Test customer address retrieval soft-deleted not found.
 *
 * Validates the soft-delete business rule: when an address is deleted, it is preserved for historical order records but excluded from active selection and retrieval. The endpoint returns 404 Not Found for soft-deleted addresses.
 *
 * Prerequisites:
 * 1. Create a new member account via /shoppingMall/auth/member/join
 * 2. Create a shipping address for the member via /shoppingMall/member/addresses (POST)
 * 3. Delete the address via /shoppingMall/member/addresses/{addressId} (DELETE)
 *
 * Test Steps:
 * 1. Authenticate as the member and obtain access token
 * 2. Create a shipping address with complete information
 * 3. Store the address ID
 * 4. Delete the address via DELETE /shoppingMall/member/addresses/{addressId}
 * 5. Call GET /shoppingMall/member/addresses/{addressId} with the same address ID
 * 6. Verify the response returns 404 Not Found
 *
 * Validation Points:
 * 1. Response status is 404 Not Found
 * 2. The address record still exists in database with deleted_at timestamp set (preserved for order history)
 * 3. The address is not returned in active address queries
 * 4. This ensures deleted addresses cannot be used for new orders while maintaining historical integrity
 */
export async function test_api_customer_address_retrieval_soft_deleted_not_found(
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
  // 2. Create a shipping address for the member
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {},
  );
  typia.assert(address);
  // 3. Store the address ID for later retrieval attempt
  const addressId = address.id;
  // 4. Delete the address via DELETE endpoint
  await api.functional.shoppingMall.member.addresses.erase(memberConnection, {
    addressId: addressId,
  });
  // 5. Attempt to retrieve the soft-deleted address - should return 404
  await TestValidator.error(
    "soft-deleted address retrieval returns 404",
    async () => {
      await api.functional.shoppingMall.member.addresses.at(memberConnection, {
        addressId: addressId,
      });
    },
  );
}
