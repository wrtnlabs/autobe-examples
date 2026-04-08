import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_address } from "../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Generate a random shopping mall customer address via the API for E2E testing.
 *
 * Prepares random address data using the prepare function, then calls the customer
 * address creation endpoint. The address is created for the authenticated customer
 * whose profile ID is extracted from the session context.
 *
 * This function supports test-time customization through the optional body parameter,
 * allowing tests to override specific address fields while auto-generating the rest
 * with realistic data including recipient name, phone, street address, city, state,
 * postal code, country, and default address flag.
 *
 * @param connection - API connection with authentication context
 * @param props - Optional customization for address creation data
 * @param props.body - Partial address creation data to override random generation
 * @returns The newly created address entity with generated UUID and timestamps
 */
export async function generate_random_shopping_mall_member_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerAddress.ICreate> | undefined;
  },
): Promise<IShoppingMallCustomerAddress> {
  const prepared: IShoppingMallCustomerAddress.ICreate =
    prepare_random_shopping_mall_customer_address(props.body);
  const result: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.member.addresses.create(connection, {
      body: prepared,
    });
  return result;
}
