import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentDispute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
import type { IShoppingMallPaymentDisputeEvidence } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDisputeEvidence";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_payment_dispute_retrieval_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access dispute records
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Retrieve payment disputes with the index endpoint
  const response =
    await api.functional.shoppingMall.admin.dashboard.payments.disputes.index(
      adminConnection,
    );
  typia.assert(response);
  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination current page is valid",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is positive",
    response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
    true,
  );
  // Step 4: Validate data structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Step 5: Validate each dispute has correct structure and allowed values
  const allowedDisputeTypes = [
    "double_charge",
    "incorrect_amount",
    "invalid_service",
    "item_not_received",
    "item_different_than_described",
  ] as const;
  const allowedStatuses = [
    "pending",
    "in_review",
    "resolved",
    "rejected",
  ] as const;
  // Validate each dispute record
  response.data.forEach((dispute) => {
    // Validate required fields with appropriate types
    TestValidator.equals(
      "dispute has payment_id as UUID",
      typeof dispute.payment_id === "string",
      true,
    );
    TestValidator.predicate(
      "dispute payment_id is in UUID format",
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        dispute.payment_id,
      ),
    );
    TestValidator.equals(
      "dispute has dispute_type as string",
      typeof dispute.dispute_type === "string",
      true,
    );
    TestValidator.predicate(
      "dispute_type is valid",
      allowedDisputeTypes.includes(typia.assert<"double_charge" | "incorrect_amount" | "invalid_service" | "item_not_received" | "item_different_than_described">(dispute.dispute_type)),
    );
    TestValidator.equals(
      "dispute has status as string",
      typeof dispute.status === "string",
      true,
    );
    TestValidator.predicate(
      "status is valid",
      allowedStatuses.includes(typia.assert<"pending" | "in_review" | "resolved" | "rejected">(dispute.status)),
    );
    TestValidator.equals(
      "dispute has reason as string",
      typeof dispute.reason === "string",
      true,
    );
    TestValidator.predicate(
      "reason has minimum length",
      dispute.reason.length >= 1,
    );
    TestValidator.predicate(
      "reason has maximum length",
      dispute.reason.length <= 5000,
    );
    TestValidator.equals(
      "dispute has supporting_evidence as array",
      Array.isArray(dispute.supporting_evidence),
      true,
    );
    // Validate evidence items are strings
    dispute.supporting_evidence.forEach((evidence) => {
      TestValidator.equals(
        "evidence item is string",
        typeof evidence === "string",
        true,
      );
    });
    TestValidator.equals(
      "dispute has user_id as UUID",
      typeof dispute.user_id === "string",
      true,
    );
    TestValidator.predicate(
      "user_id is in UUID format",
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        dispute.user_id,
      ),
    );
    TestValidator.equals(
      "dispute has created_at as date-time string",
      typeof dispute.created_at === "string",
      true,
    );
    TestValidator.predicate(
      "created_at follows ISO 8601 format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
        dispute.created_at,
      ),
    );
  });
  // Step 6: Verify response contains at least one record for meaningful testing
  TestValidator.predicate(
    "at least one dispute returned",
    response.data.length > 0,
  );
  // Step 7: Validate we have a mix of statuses and dispute types for filtering context
  const statusCount = response.data.reduce(
    (acc, dispute) => {
      acc[dispute.status] = (acc[dispute.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const disputeTypeCount = response.data.reduce(
    (acc, dispute) => {
      acc[dispute.dispute_type] = (acc[dispute.dispute_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  // Verify we have at least one example of common statuses
  TestValidator.predicate(
    "has at least one pending dispute",
    statusCount.pending > 0,
  );
  TestValidator.predicate(
    "has at least one in_review dispute",
    statusCount.in_review > 0,
  );
  // Verify we have at least one example of common dispute types
  TestValidator.predicate(
    "has at least one double_charge dispute",
    disputeTypeCount.double_charge > 0,
  );
  TestValidator.predicate(
    "has at least one incorrect_amount dispute",
    disputeTypeCount.incorrect_amount > 0,
  );
  // Note: While the scenario requires testing filtering by status and dispute_type,
  // the API's SDK function index() does not accept any parameters for filtering.
  // This prevents direct testing of the specified filtering functionality.
  // This test verifies the response structure and data integrity, assuming the filtering
  // functionality is implemented on the server-side and accessible through query parameters
  // not exposed in this SDK definition.
}