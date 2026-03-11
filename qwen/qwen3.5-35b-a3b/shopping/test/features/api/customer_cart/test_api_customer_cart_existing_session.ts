import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer cart existing session scenario.
 * Validates that system prevents duplicate cart creation when customer already has active cart.
 */
export async function test_api_customer_cart_existing_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: typia.random<IEcommerceMallCustomer.IJoin>(),
    });
  typia.assert(customerAuth);
  // Step 2: Create first cart
  const firstCartResponse: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(firstCartResponse);
  // Step 3: Store first cart details
  const firstCartId: string = firstCartResponse.id;
  const firstCreatedAt: string & tags.Format<"date-time"> =
    firstCartResponse.created_at;
  const firstUpdatedAt: string & tags.Format<"date-time"> =
    firstCartResponse.updated_at;
  // Step 4: Create second cart (should handle duplicate cart scenario)
  const secondCartResponse: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(secondCartResponse);
  // Step 5: Validate business logic
  // The system should either return the same cart or create a conflict
  TestValidator.equals(
    "second cart is original cart",
    secondCartResponse.id,
    firstCartId,
  );
  // Created at timestamp should remain unchanged (cart wasn't recreated)
  TestValidator.equals(
    "created_at unchanged",
    secondCartResponse.created_at,
    firstCreatedAt,
  );
  // Updated at timestamp should reflect recent modification attempt
  TestValidator.predicate(
    "updated_at is recent",
    () => new Date(secondCartResponse.updated_at) >= new Date(),
  );
}
