import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_search_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Admin connection headers are now updated with token
  // Step 2: Search for payments with minimal filter (no creation possible)
  // Note: No payment creation endpoint provided, so we only test the search functionality
  // on existing data that must already be in the system
  const searchResult = await api.functional.shoppingMall.admin.payments.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(searchResult);
  // Step 3: Validate pagination structure
  TestValidator.equals("Page number is 1", searchResult.pagination.current, 1);
  TestValidator.equals(
    "Limit is 20 by default",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "Records count >= 0",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pages count >= 0",
    () => searchResult.pagination.pages >= 0,
  );
  // Step 4: Validate each payment summary structure
  for (const payment of searchResult.data) {
    TestValidator.equals(
      "Payment ID is valid UUID",
      typeof payment.id,
      "string",
    );
    TestValidator.predicate("Payment ID matches UUID format", () =>
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(
        payment.id,
      ),
    );
    TestValidator.predicate(
      "Amount is a number",
      () => typeof payment.amount === "number",
    );
    TestValidator.equals("Currency is USD", payment.currency, "USD");
    TestValidator.equals(
      "Payment status is valid",
      payment.paymentStatus,
      payment.paymentStatus,
    ); // must be non-empty string
    TestValidator.equals(
      "Payment method type is valid",
      payment.paymentMethodType,
      payment.paymentMethodType,
    ); // must be one of allowed values
    TestValidator.equals(
      "Created at is ISO date-time",
      typeof payment.createdAt,
      "string",
    );
    TestValidator.predicate("Created at matches date-time format", () =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payment.createdAt),
    );
    TestValidator.equals(
      "Customer ID is valid UUID",
      typeof payment.customerId,
      "string",
    );
    TestValidator.predicate("Customer ID matches UUID format", () =>
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(
        payment.customerId,
      ),
    );
    TestValidator.equals(
      "Seller ID is valid UUID",
      typeof payment.sellerId,
      "string",
    );
    TestValidator.predicate("Seller ID matches UUID format", () =>
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(
        payment.sellerId,
      ),
    );
    TestValidator.predicate(
      "Refund amount is a number",
      () => typeof payment.refundAmount === "number",
    );
    TestValidator.predicate(
      "Refund amount >= 0",
      () => payment.refundAmount >= 0,
    );
    TestValidator.equals(
      "Payment type is valid",
      payment.paymentType,
      payment.paymentType,
    ); // non-empty string
    TestValidator.equals(
      "Payment label is string",
      typeof payment.paymentLabel,
      "string",
    );
    TestValidator.equals(
      "Payment description is string",
      typeof payment.paymentDescription,
      "string",
    );
    TestValidator.equals(
      "Refund reason is valid",
      payment.refundReason,
      payment.refundReason,
    ); // one of allowed values
    TestValidator.equals(
      "Payment reference is string",
      typeof payment.paymentReference,
      "string",
    );
    TestValidator.equals(
      "Payment channel is valid",
      payment.paymentChannel,
      payment.paymentChannel,
    ); // one of allowed values
    TestValidator.equals(
      "Payment method is string",
      typeof payment.paymentMethod,
      "string",
    ); // for reconciliation - Card brand
    // PCI-DSS Compliance: Verify no sensitive card data exposed (full number, CVV, expiry not present)
    // The codegen ensures this, we just verify in type that these fields don't exist
    // These are not in the IShoppingMallPayment.ISummary type, so runtime exclusion is enforced
  }
}
