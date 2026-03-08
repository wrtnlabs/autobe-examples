import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
/**
 * Test successful deletion of the customer's only address, which is also the default address.
 *
 * This test validates the edge case where a customer deletes their only address,
 * which by definition is also their default address. The system should allow this
 * operation and the customer will have no addresses afterward.
 */
export async function test_api_address_only_address_deletion_success(connection: api.IConnection): Promise<void> {
    // Step 1: Create customer connection and authenticate
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            displayName: RandomGenerator.name(),
            phoneNumber: RandomGenerator.mobile(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    // Step 2: Create a single address (automatically becomes default since it's first)
    const address = await generate_random_shopping_mall_customer_addresses_create(customerConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            street_address: RandomGenerator.paragraph({ sentences: 1 }),
            city: RandomGenerator.name(),
            state_province: RandomGenerator.name(),
            postal_code: RandomGenerator.alphaNumeric(6),
            country: RandomGenerator.name(),
        },
    });
    typia.assert(address);
    // Verify address was created as default (first address auto-becomes default)
    TestValidator.equals("address is default", address.isDefault, true);
    TestValidator.equals("address has no deletedAt", address.deletedAt, null);
    // Step 3: Delete the only address (which is also the default)
    // This should succeed because it's the only address - no other addresses to reassign default
    await api.functional.shoppingMall.customer.addresses.erase(customerConnection, {
        addressId: address.id,
    });
    // Step 4: Verify deletion - attempting to delete same address again should fail
    // Since the address is soft-deleted, a second deletion should return 404 Not Found
    await TestValidator.error("already deleted address should throw error", async () => {
        await api.functional.shoppingMall.customer.addresses.erase(customerConnection, {
            addressId: address.id,
        });
    });
}