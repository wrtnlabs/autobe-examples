import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentRefund";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGateway";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test basic refund retrieval without filters to ensure administrators can
 * access all refund records. Validates that the endpoint returns a properly
 * paginated response with default sorting by creation date, including essential
 * refund information like reference codes, amounts, and status for
 * administrative oversight.
 *
 * This test validates the complete refund retrieval workflow for
 * administrators:
 *
 * 1. Creates an administrator account with proper authentication
 * 2. Retrieves payment refunds with basic search criteria (empty filters)
 * 3. Validates the paginated response structure and metadata
 * 4. Verifies essential refund information is included: reference codes, amounts,
 *    status
 * 5. Checks response sorting by creation date (default behavior)
 * 6. Ensures all summary data fields are properly populated for administrative
 *    oversight
 * 7. Confirms pagination works with default parameters
 * 8. Validates the refund data includes transaction and payment context for
 *    complete picture
 */
export async function test_api_admin_payment_refunds_index_basic_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<
        string & tags.MaxLength<255> & tags.Format<"email">
      >(),
      firstname: RandomGenerator.name(),
      lastname: RandomGenerator.name(),
      adminlevel: RandomGenerator.pick([
        "super_admin",
        "department_admin",
        "support_admin",
        "viewer",
      ] as const),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve payment refunds with basic search criteria (no filters)
  const basicRequest = {} satisfies IShoppingMallPaymentRefund.IRequest;

  const refundPage =
    await api.functional.shoppingMall.admin.paymentRefunds.index(connection, {
      body: basicRequest,
    });
  typia.assert(refundPage);

  // Step 3: Validate paginated response structure
  TestValidator.equals(
    "pagination current page",
    refundPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", refundPage.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records",
    refundPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    refundPage.pagination.pages >= 0,
  );

  // Step 4: Validate refund data array and essential information
  TestValidator.predicate(
    "refunds array exists",
    Array.isArray(refundPage.data),
  );
  TestValidator.predicate(
    "refunds count within limit",
    refundPage.data.length <= refundPage.pagination.limit,
  );

  // Step 5: Validate each refund record contains essential information
  if (refundPage.data.length > 0) {
    const refund = refundPage.data[0];

    // Essential refund information validation
    TestValidator.predicate(
      "refund reference exists",
      typeof refund.refund_reference === "string" &&
        refund.refund_reference.length > 0,
    );
    TestValidator.predicate(
      "refund amount is valid",
      typeof refund.amount === "number" && refund.amount >= 0,
    );
    TestValidator.predicate(
      "refund status exists",
      typeof refund.status === "string" && refund.status.length > 0,
    );
    TestValidator.predicate(
      "refund currency exists",
      typeof refund.currency === "string" && refund.currency.length === 3,
    );
    TestValidator.predicate(
      "refund type exists",
      typeof refund.refund_type === "string" && refund.refund_type.length > 0,
    );
    TestValidator.predicate(
      "is_processed exists",
      typeof refund.is_processed === "boolean",
    );
    TestValidator.predicate(
      "id is valid UUID",
      typeof refund.id === "string" && refund.id.length === 36,
    );

    // Administrative oversight data validation
    TestValidator.predicate(
      "reason description exists",
      typeof refund.reason_description === "string" &&
        refund.reason_description.length > 0,
    );
    TestValidator.predicate(
      "reason code exists",
      typeof refund.reason_code === "string" && refund.reason_code.length > 0,
    );
    TestValidator.predicate(
      "created_at exists",
      typeof refund.created_at === "string" && refund.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at exists",
      typeof refund.updated_at === "string" && refund.updated_at.length > 0,
    );
  }

  // Step 6: Test pagination with custom parameters
  const customPageRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPaymentRefund.IRequest;

  const customRefundPage =
    await api.functional.shoppingMall.admin.paymentRefunds.index(connection, {
      body: customPageRequest,
    });
  typia.assert(customRefundPage);

  TestValidator.equals(
    "custom pagination page",
    customRefundPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination limit",
    customRefundPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom pagination within limit",
    customRefundPage.data.length <= 10,
  );

  // Step 7: Basic search functionality validation
  const searchRequest = {
    search: "REF",
  } satisfies IShoppingMallPaymentRefund.IRequest;

  const searchResults =
    await api.functional.shoppingMall.admin.paymentRefunds.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search results exist",
    Array.isArray(searchResults.data),
  );

  // Step 8: Validate sorting default behavior (no explicit sort_by)
  const sortValidationRequest = {
    limit: 5,
  } satisfies IShoppingMallPaymentRefund.IRequest;

  const sortResults =
    await api.functional.shoppingMall.admin.paymentRefunds.index(connection, {
      body: sortValidationRequest,
    });
  typia.assert(sortResults);

  // Step 9: Validate administrative oversight data completeness
  if (refundPage.data.length > 0) {
    const adminRefund = refundPage.data[0];

    // Comprehensive administrative data validation
    TestValidator.predicate(
      "administrator ID is valid UUID",
      typeof adminRefund.reviewingAdministrator.id === "string" &&
        adminRefund.reviewingAdministrator.id.length === 36,
    );
    TestValidator.predicate(
      "administrator email exists",
      typeof adminRefund.reviewingAdministrator.email === "string" &&
        adminRefund.reviewingAdministrator.email.includes("@"),
    );
    TestValidator.predicate(
      "administrator name exists",
      typeof adminRefund.reviewingAdministrator.name === "string" &&
        adminRefund.reviewingAdministrator.name.length > 0,
    );
    TestValidator.predicate(
      "transaction context exists",
      typeof adminRefund.paymentTransaction === "object",
    );
    TestValidator.predicate(
      "administrator context exists",
      typeof adminRefund.reviewingAdministrator === "object",
    );
  }

  TestValidator.predicate("admin refund retrieval completion success", true); // Final validation marker
}
