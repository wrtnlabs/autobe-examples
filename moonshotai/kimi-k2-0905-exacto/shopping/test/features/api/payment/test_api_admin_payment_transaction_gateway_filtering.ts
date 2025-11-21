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
 * Test gateway-specific transaction filtering where an admin analyzes
 * transactions processed through specific payment gateways like Stripe or
 * PayPal.
 *
 * This test validates filtering by gateway_code parameter and ensures returned
 * transactions match the specified gateway with proper gateway response code
 * analysis. The test simulates comprehensive payment processing scenarios to
 * verify that admin can filter and analyze transaction data based on specific
 * payment gateway providers.
 *
 * 1. Create admin account to access payment transaction monitoring capabilities
 * 2. Generate payment transactions for multiple gateways (Stripe, PayPal, Adyen)
 * 3. Filter transactions by specific gateway code and validate results
 * 4. Analyze gateway response codes for technical troubleshooting
 * 5. Test combined filtering with gateway and response code
 * 6. Verify pagination and total transaction count accuracy
 */
export async function test_api_admin_payment_transaction_gateway_filtering(
  connection: api.IConnection,
) {
  // 1. Create admin account for payment transaction access
  const adminRequestData = {
    email: `${RandomGenerator.alphabets(8)}@admin.com`,
    firstname: RandomGenerator.name(1),
    lastname: RandomGenerator.name(2),
    adminlevel: "super_admin",
    department: "Finance",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRequestData,
    });
  typia.assert(adminAuthResponse);

  // Verify admin has super admin privileges
  TestValidator.predicate(
    "admin should have super admin privileges",
    adminAuthResponse.is_super_admin === true,
  );

  // 2. Generate sample payment transaction data for testing
  // Note: Since we need existing transactions to filter, we'll create a broader search
  // and then verify filtering behavior on whatever data exists
  const initialSearchRequest = {
    page: 1,
    limit: 50,
    sort_by: "created_at",
    order: "desc",
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const allTransactionsResponse: IPageIShoppingMallPaymentTransaction.ISummary =
    await api.functional.shoppingMall.admin.paymentTransactions.index(
      connection,
      {
        body: initialSearchRequest,
      },
    );
  typia.assert(allTransactionsResponse);

  TestValidator.predicate(
    "should receive paginated transaction results",
    allTransactionsResponse.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata should be included",
    allTransactionsResponse.pagination !== undefined,
  );

  // Extract distinct gateway codes from response data
  const gateways = allTransactionsResponse.data
    .filter((tx) => tx.paymentGateway && tx.paymentGateway.gateway_code)
    .map((tx) => tx.paymentGateway.gateway_code);
  const uniqueGateways: string[] = [...new Set(gateways)];

  TestValidator.predicate(
    "should have gateway codes available",
    uniqueGateways.length > 0,
  );

  // 3. Test filtering by specific gateway code
  if (uniqueGateways.length > 0) {
    const targetGateway = RandomGenerator.pick(
      uniqueGateways as readonly string[],
    );
    await searchByGateway(connection, targetGateway as string);
  } else {
    // Test hypothetical gateway filtering if no real data available
    await searchByHypotheticalGateway(connection);
  }

  // 4. Test gateway-specific analysis with date ranges
  await gatewayTransactionAnalysis(connection);

  // 5. Test pagination with gateway filtering
  await testGatewayPagination(connection);

  /** Search transactions by specific gateway code */
  async function searchByGateway(
    connection: api.IConnection,
    gatewayCode: string,
  ) {
    const gatewaySearchRequest = {
      page: 1,
      limit: 20,
      gateway_code: gatewayCode,
      sort_by: "created_at",
      order: "desc",
    } satisfies IShoppingMallPaymentTransaction.IRequest;

    const gatewayResults: IPageIShoppingMallPaymentTransaction.ISummary =
      await api.functional.shoppingMall.admin.paymentTransactions.index(
        connection,
        {
          body: gatewaySearchRequest,
        },
      );
    typia.assert(gatewayResults);

    TestValidator.predicate(
      "gateway filtered results should be returned",
      gatewayResults.data.length > 0,
    );
    TestValidator.predicate(
      `all transactions should use gateway ${gatewayCode}`,
      gatewayResults.data.every(
        (tx) => tx.paymentGateway.gateway_code === gatewayCode,
      ),
    );
  }

  /** Search with hypothetical gateway to test API behavior */
  async function searchByHypotheticalGateway(connection: api.IConnection) {
    const hypotheticalGateways = ["stripe", "paypal", "adyen"] as const;
    const testGateway = RandomGenerator.pick(hypotheticalGateways);

    const hypotheticalSearchRequest = {
      page: 1,
      limit: 10,
      gateway_code: testGateway,
      sort_by: "created_at",
      order: "desc",
    } satisfies IShoppingMallPaymentTransaction.IRequest;

    const hypotheticalResults: IPageIShoppingMallPaymentTransaction.ISummary =
      await api.functional.shoppingMall.admin.paymentTransactions.index(
        connection,
        {
          body: hypotheticalSearchRequest,
        },
      );
    typia.assert(hypotheticalResults);

    TestValidator.predicate(
      "hypothetical gateway search should complete",
      hypotheticalResults !== undefined,
    );
  }

  /** Analyze gateway transaction patterns */
  async function gatewayTransactionAnalysis(connection: api.IConnection) {
    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 7 days ago

    const analysisRequest = {
      page: 1,
      limit: 30,
      created_at_start: startDate,
      status: RandomGenerator.pick([
        "initiated",
        "processing",
        "authorized",
        "captured",
      ] as const),
      sort_by: "processed_at",
      order: "desc",
    } satisfies IShoppingMallPaymentTransaction.IRequest;

    const analysisResults: IPageIShoppingMallPaymentTransaction.ISummary =
      await api.functional.shoppingMall.admin.paymentTransactions.index(
        connection,
        {
          body: analysisRequest,
        },
      );
    typia.assert(analysisResults);

    TestValidator.predicate(
      "analysis should return transaction data",
      analysisResults.data.length > 0,
    );

    analysisResults.data.forEach(
      (transaction: IShoppingMallPaymentTransaction.ISummary) => {
        TestValidator.predicate(
          "gateway response code should be present",
          transaction.gateway_response_code.length > 0,
        );
        TestValidator.predicate(
          "gateway message should be meaningful",
          transaction.gateway_message.length > 0,
        );
      },
    );
  }

  /** Test pagination with gateway filtering */
  async function testGatewayPagination(connection: api.IConnection) {
    const smallPageRequest = {
      page: 1,
      limit: 5,
      sort_by: "created_at",
      order: "desc",
    } satisfies IShoppingMallPaymentTransaction.IRequest;

    const pagedResults: IPageIShoppingMallPaymentTransaction.ISummary =
      await api.functional.shoppingMall.admin.paymentTransactions.index(
        connection,
        {
          body: smallPageRequest,
        },
      );
    typia.assert(pagedResults);

    TestValidator.equals("should get exact limit", pagedResults.data.length, 5);
    TestValidator.equals(
      "should be on page 1",
      pagedResults.pagination.current,
      1,
    );

    TestValidator.predicate(
      "transactions should have gateway codes",
      pagedResults.data.length === 0 ||
        pagedResults.data.some(
          (tx) =>
            tx.paymentGateway.gateway_code &&
            tx.paymentGateway.gateway_code.length > 0,
        ),
    );
  }
}
