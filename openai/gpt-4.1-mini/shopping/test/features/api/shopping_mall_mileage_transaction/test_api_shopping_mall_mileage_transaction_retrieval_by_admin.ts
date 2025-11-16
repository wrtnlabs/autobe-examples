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

export async function test_api_shopping_mall_mileage_transaction_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminStrongPass1234!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create mileage transaction record by admin
  const customerCode =
    "CUST-" +
    String(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
      >(),
    );
  const orderCode =
    "ORDER-" +
    String(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
      >(),
    );

  const transactionCreateBody = {
    customer_code: customerCode,
    transaction_type: "earn",
    points: 1000,
    description: "Initial earning points",
    status: "completed",
    order_code: orderCode,
  } satisfies IShoppingMallMileageTransaction.ICreate;

  const createdTransaction: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.create(
      connection,
      { body: transactionCreateBody },
    );
  typia.assert(createdTransaction);

  // 3. Retrieve the same mileage transaction by id
  const retrievedTransaction: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.at(
      connection,
      { shoppingMallMileageTransactionId: createdTransaction.id },
    );
  typia.assert(retrievedTransaction);

  // 4. Validate all transaction fields
  TestValidator.equals(
    "transaction id",
    retrievedTransaction.id,
    createdTransaction.id,
  );
  TestValidator.equals(
    "transaction type",
    retrievedTransaction.transaction_type,
    transactionCreateBody.transaction_type,
  );
  TestValidator.equals(
    "points",
    retrievedTransaction.points,
    transactionCreateBody.points,
  );
  TestValidator.equals(
    "description",
    retrievedTransaction.description,
    transactionCreateBody.description,
  );
  TestValidator.equals(
    "status",
    retrievedTransaction.status,
    transactionCreateBody.status,
  );

  // linked customer and order must match those of the created transaction
  TestValidator.equals(
    "customer summary",
    retrievedTransaction.customer,
    createdTransaction.customer,
  );

  if (createdTransaction.order !== undefined) {
    TestValidator.equals(
      "order summary id",
      retrievedTransaction.order?.id,
      createdTransaction.order?.id,
    );
  }

  // timestamps should be valid ISO strings and not empty
  TestValidator.predicate(
    "created_at is ISO date",
    typeof retrievedTransaction.created_at === "string" &&
      retrievedTransaction.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof retrievedTransaction.updated_at === "string" &&
      retrievedTransaction.updated_at.length > 0,
  );
}
