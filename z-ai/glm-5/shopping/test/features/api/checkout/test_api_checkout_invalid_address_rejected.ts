import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that checkout is rejected when an invalid address is provided.
 *
 * Business Rule: The system SHALL require customers to select a shipping address
 * during checkout. Address validation includes: address must exist, belong to
 * authenticated customer, and not be soft-deleted.
 *
 * Test Scenarios:
 * 1. Non-existent addressId: Call checkout with UUID that doesn't exist
 * 2. Other customer's address: Call checkout with addressId belonging to another customer
 */
export async function test_api_checkout_invalid_address_rejected(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Scenario 1: Non-existent address ID
  // ========================================
  {
    // Create customer and authenticate
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    // Generate a random UUID that doesn't exist
    const nonExistentAddressId = typia.random<string & tags.Format<"uuid">>();
    // Attempt checkout - should fail
    await TestValidator.error(
      "checkout with non-existent address should be rejected",
      async () => {
        await api.functional.shoppingMall.customer.checkout.create(
          customerConnection,
          {
            body: {
              addressId: nonExistentAddressId,
            } satisfies IShoppingMallOrder.ICreate,
          },
        );
      },
    );
  }
  // ========================================
  // Scenario 2: Using another customer's address
  // ========================================
  {
    // Create first customer and their address
    const customerAConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerAConnection, {});
    const addressA =
      await generate_random_shopping_mall_customer_addresses_create(
        customerAConnection,
        {},
      );
    typia.assert(addressA);
    // Create second customer (the one attempting checkout)
    const customerBConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerBConnection, {});
    // Attempt checkout with customer A's address - should fail
    await TestValidator.error(
      "checkout with another customer's address should be rejected",
      async () => {
        await api.functional.shoppingMall.customer.checkout.create(
          customerBConnection,
          {
            body: {
              addressId: addressA.id,
            } satisfies IShoppingMallOrder.ICreate,
          },
        );
      },
    );
  }
}
