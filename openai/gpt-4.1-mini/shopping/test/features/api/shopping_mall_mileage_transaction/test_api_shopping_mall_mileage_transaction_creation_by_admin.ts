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

export async function test_api_shopping_mall_mileage_transaction_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
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

  // 2. Generate a realistic mileage transaction create request
  const transactionTypeCandidates = ["earn", "use", "expire"] as const;
  const statusCandidates = ["pending", "completed", "cancelled"] as const;

  const transactionType = RandomGenerator.pick(transactionTypeCandidates);
  const status = RandomGenerator.pick(statusCandidates);
  const points: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const description = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const customerCode = `customer-${typia.random<string & tags.Format<"uuid">>()}`;
  const orderCode = `order-${typia.random<string & tags.Format<"uuid">>()}`;

  const mileageTransactionBody = {
    customer_code: customerCode,
    transaction_type: transactionType,
    points: points satisfies number as number,
    description: description,
    status: status,
    order_code: orderCode,
  } satisfies IShoppingMallMileageTransaction.ICreate;

  // 3. Call the create mileage transaction API
  const createdTransaction: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.shoppingMallMileageTransactions.create(
      connection,
      {
        body: mileageTransactionBody,
      },
    );
  typia.assert(createdTransaction);

  // 4. Validate basic properties
  TestValidator.predicate("admin role is 'admin'", admin.role === "admin");
  TestValidator.equals(
    "transaction_type matches input",
    createdTransaction.transaction_type,
    transactionType,
  );
  TestValidator.equals("points match input", createdTransaction.points, points);
  TestValidator.equals(
    "description matches input",
    createdTransaction.description,
    description,
  );
  TestValidator.equals(
    "status matches input",
    createdTransaction.status,
    status,
  );

  // 5. Validate related customer reference
  TestValidator.predicate(
    "customer object exists",
    createdTransaction.customer != null,
  );
  TestValidator.predicate(
    "customer id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTransaction.customer.id,
    ),
  );

  // 6. If order is present, validate order summary
  if (
    createdTransaction.order !== undefined &&
    createdTransaction.order !== null
  ) {
    TestValidator.predicate(
      "order object exists",
      createdTransaction.order != null,
    );
    TestValidator.predicate(
      "order id is uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdTransaction.order.id,
      ),
    );
  }

  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(createdTransaction.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(createdTransaction.updated_at)),
  );
}
