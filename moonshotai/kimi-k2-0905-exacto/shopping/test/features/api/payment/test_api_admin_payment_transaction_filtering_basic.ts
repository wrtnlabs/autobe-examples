import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGateway";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test basic payment transaction filtering functionality where an admin
 * searches for transactions within a specific date range and amount threshold.
 * Validates that the filtering system correctly applies search criteria and
 * returns paginated results with proper transaction summaries including gateway
 * information, payment method details, and processing status.
 */
export async function test_api_admin_payment_transaction_filtering_basic(
  connection: api.IConnection,
) {
  //Step 1: Create admin account for authentication to access payment transaction data
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: RandomGenerator.name(1),
      lastname: RandomGenerator.name(1),
      adminlevel: RandomGenerator.pick([
        "super_admin",
        "department_admin",
        "support_admin",
        "viewer",
      ] as const),
      department: "Finance",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const startDate: string = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate: string = new Date().toISOString(); // current time
  const minAmount: number = 50.0;
  const maxAmount: number = 500.0;

  //Step 2: Test transaction filtering with date range and amount threshold
  const requestBody: IShoppingMallPaymentTransaction.IRequest = {
    page: 1,
    limit: 20,
    created_at_start: startDate,
    created_at_end: endDate,
    amount_min: minAmount,
    amount_max: maxAmount,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const response =
    await api.functional.shoppingMall.admin.paymentTransactions.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert(response);

  //Step 3: validate response structure and pagination
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined && response.pagination !== null,
  );
  TestValidator.equals("pagination page", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);

  if (response.data.length > 0) {
    // Verify ALL returned transactions meet filter criteria
    TestValidator.predicate(
      "all transactions match amount filter",
      response.data.every(
        (t) =>
          t.amount >= requestBody.amount_min! &&
          t.amount <= requestBody.amount_max!,
      ),
    );

    // Verify ALL returned transactions meet date filter criteria
    TestValidator.predicate(
      "all transactions match date filter",
      response.data.every((t) => {
        const transactionDate = new Date(t.created_at);
        const start = new Date(requestBody.created_at_start!);
        const end = new Date(requestBody.created_at_end!);
        return transactionDate >= start && transactionDate <= end;
      }),
    );
  }

  //Step 4: Validate transaction details include complete summary information
  //Since we tested filtering in step 3, just validate structure here
  for (const transaction of response.data) {
    //Validate gateway information is included
    TestValidator.predicate(
      "has gateway info",
      transaction.paymentGateway !== undefined &&
        transaction.paymentGateway !== null,
    );
    TestValidator.predicate(
      "gateway has valid code",
      transaction.paymentGateway.gateway_code !== undefined &&
        transaction.paymentGateway.gateway_code.length > 0,
    );

    //Validate payment method details are included
    TestValidator.predicate(
      "has method info",
      transaction.paymentMethod !== undefined &&
        transaction.paymentMethod !== null,
    );
    TestValidator.predicate(
      "method has id",
      transaction.paymentMethod.id !== undefined &&
        transaction.paymentMethod.id.length > 0,
    );
    TestValidator.predicate(
      "method has category",
      transaction.paymentMethod.method_category !== undefined &&
        transaction.paymentMethod.method_category.length > 0,
    );

    //Validate order summary is included
    TestValidator.predicate(
      "has order payment",
      transaction.orderPayment !== undefined &&
        transaction.orderPayment !== null,
    );
    TestValidator.predicate(
      "order has seller",
      transaction.orderPayment.seller !== undefined &&
        transaction.orderPayment.seller !== null,
    );
    TestValidator.predicate(
      "order has order id",
      transaction.orderPayment.shopping_mall_order_id !== undefined &&
        transaction.orderPayment.shopping_mall_order_id.length > 0,
    );
  }
}
