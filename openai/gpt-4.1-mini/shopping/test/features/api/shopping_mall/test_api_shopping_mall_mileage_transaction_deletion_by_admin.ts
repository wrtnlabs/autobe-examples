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

export async function test_api_shopping_mall_mileage_transaction_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const email = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email,
        name: RandomGenerator.name(),
        password: "S3cureP@ssw0rd!",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create mileage transaction for later deletion
  const createBody: IShoppingMallMileageTransaction.ICreate = {
    customer_code: "customer_code_sample",
    transaction_type: "earn",
    points: 100,
    description: "Test mileage transaction to be deleted",
    status: "pending",
  };
  const transaction: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(transaction);

  // 3. Delete the created mileage transaction
  await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.erase(
    connection,
    {
      shoppingMallMileageTransactionId: transaction.id,
    },
  );

  // 4. Confirm deletion by attempting to delete again and expecting error
  await TestValidator.error(
    "deleting non-existent transaction should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.erase(
        connection,
        {
          shoppingMallMileageTransactionId: transaction.id,
        },
      );
    },
  );
}
