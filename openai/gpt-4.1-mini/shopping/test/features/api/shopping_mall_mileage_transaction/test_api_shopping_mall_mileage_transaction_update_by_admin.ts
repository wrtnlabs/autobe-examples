import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_mileage_transaction_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "1234",
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a mileage transaction to update later
  const mileageTransactionCreateBody = {
    customer_code: `customer-${RandomGenerator.alphaNumeric(6)}`,
    transaction_type: "earn",
    points: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: RandomGenerator.paragraph(),
    status: "pending",
    order_code: `order-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallMileageTransaction.ICreate;

  const createdMileageTransaction: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.create(
      connection,
      { body: mileageTransactionCreateBody },
    );
  typia.assert(createdMileageTransaction);

  // Step 3: Update the mileage transaction with new points and status
  // Prepare update body
  const updateBody = {
    points:
      createdMileageTransaction.points +
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    status: "approved",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallMileageTransaction.IUpdate;

  // Call update API
  const updatedMileageTransaction: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.update(
      connection,
      {
        shoppingMallMileageTransactionId: createdMileageTransaction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMileageTransaction);

  // Assertions
  TestValidator.equals(
    "updated points match",
    updatedMileageTransaction.points,
    updateBody.points,
  );
  TestValidator.equals(
    "updated status match",
    updatedMileageTransaction.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated description match",
    updatedMileageTransaction.description,
    updateBody.description,
  );
}
