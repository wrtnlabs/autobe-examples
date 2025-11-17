import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoints";

/**
 * Validate creating a customer loyalty point record.
 *
 * This test creates a new customer by calling auth.customer.join with unique
 * email and password, including session info href and referrer. After getting
 * authorized customer info and token, it uses the same authenticated connection
 * to create a loyalty points record with a positive point balance.
 *
 * Steps included:
 *
 * 1. Customer registration with required data.
 * 2. Using authentication from registration implicitly.
 * 3. Creating a points record with an initial balance.
 * 4. Verifying the created points record has correct balance and owner.
 *
 * Assertions are made with typia.assert for full validation and TestValidator
 * to check business rules and data consistency.
 */
export async function test_api_shopping_mall_customer_points_creation_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register new customer
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/signup";
  const referrer = "https://google.com/";

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Create points record with a valid positive balance
  const initialBalance: number & tags.Type<"int32"> & tags.Minimum<0> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();

  const pointsRecord: IShoppingMallPoints =
    await api.functional.shoppingMall.customer.points.create(connection, {
      body: {
        balance: initialBalance,
      } satisfies IShoppingMallPoints.ICreate,
    });
  typia.assert(pointsRecord);

  // Step 3: Validate that points record balance matches input
  TestValidator.equals(
    "points record balance should match initial balance",
    pointsRecord.balance,
    initialBalance,
  );

  // Step 4: Validate that points record references the authorized customer
  TestValidator.equals(
    "points record belongs to authorized customer",
    pointsRecord.shopping_mall_customer_id,
    authorizedCustomer.id,
  );
}
