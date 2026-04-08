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
 * Test that a customer cannot access another customer's shipping address to validate ownership isolation.
 *
 * This test validates the security boundary that prevents customers from viewing addresses belonging to other customers. The system must return 404 Not Found (not 403 Forbidden) to prevent information leakage about whether an address ID exists.
 *
 * Test Flow:
 * 1. Create and authenticate customer A (address owner) using authorize_member_join.
 * 2. Create a shipping address for customer A using generate_random_shopping_mall_member_addresses_create.
 * 3. Store the address ID created for customer A.
 * 4. Create and authenticate customer B (unauthorized accessor) using authorize_member_join with fresh connection.
 * 5. Attempt to GET /shoppingMall/member/addresses/{addressId} using customer B's connection with customer A's address ID.
 * 6. Verify the API call throws HttpError with status 404.
 *
 * Validation Points:
 * - Customer B receives 404 Not Found when accessing customer A's address.
 * - The error does not leak information about address existence.
 * - Ownership isolation is properly enforced at the API level.
 */
export async function test_api_customer_address_access_another_customer_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer A (address owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_member_join(customerAConnection, {});
  typia.assert(customerA);
  // 2. Create a shipping address for customer A
  const addressA = await generate_random_shopping_mall_member_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(addressA);
  // 3. Store the address ID for later use
  const addressId: string & tags.Format<"uuid"> = addressA.id;
  // 4. Create customer B (unauthorized accessor)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_member_join(customerBConnection, {});
  typia.assert(customerB);
  // 5. Attempt to access customer A's address using customer B's connection
  await TestValidator.httpError(
    "cannot access another customer's address",
    404,
    async () => {
      await api.functional.shoppingMall.member.addresses.at(
        customerBConnection,
        {
          addressId,
        },
      );
    },
  );
}
