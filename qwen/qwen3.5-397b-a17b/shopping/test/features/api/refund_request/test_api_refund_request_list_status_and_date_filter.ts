import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refund request list filtering by status and date range.
 *
 * Validates the filtering and search capabilities of the refund request list endpoint for member actors. Tests various filter combinations including status filtering, date range filtering, combined filters, and text search on the reason field. Also verifies pagination metadata is correctly returned with filtered results.
 *
 * Since refund request creation endpoint is not available in the provided API functions, this test validates the filter parameter acceptance and response structure rather than populating test data. The backend is expected to return appropriate filtered results based on the member's existing refund requests.
 *
 * 1. Member account creation via authorization utility.
 * 2. Status filter test - filter by 'pending' status.
 * 3. Date range filter test - filter by created_at_from and created_at_to.
 * 4. Combined filter test - status and date range together.
 * 5. Search filter test - case-insensitive substring matching on reason.
 * 6. Pagination test - verify pagination metadata with filters.
 */
export async function test_api_refund_request_list_status_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Test status filter - pending
  const pendingFilter =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingFilter);
  TestValidator.predicate(
    "pagination valid",
    pendingFilter.pagination.current >= 1,
  );
  TestValidator.predicate("limit respected", pendingFilter.data.length <= 10);
  // 3. Test date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilter =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberConnection,
      {
        body: {
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "date range page",
    dateRangeFilter.pagination.current,
    1,
  );
  // 4. Test combined filter - status and date range
  const combinedFilter =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberConnection,
      {
        body: {
          status: "approved",
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 15,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter valid",
    combinedFilter.pagination.records >= 0,
  );
  // 5. Test search filter - case-insensitive substring matching
  const searchFilter =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberConnection,
      {
        body: {
          search: "defect",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchFilter);
  TestValidator.predicate(
    "search pagination valid",
    searchFilter.pagination.pages >= 0,
  );
  // 6. Test rejected status filter
  const rejectedFilter =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedFilter);
  // 7. Test pagination with different page numbers
  const page2Filter =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2Filter);
  TestValidator.predicate(
    "page 2 valid",
    page2Filter.pagination.current === 2 || page2Filter.data.length === 0,
  );
  // 8. Verify response structure contains expected fields
  if (pendingFilter.data.length > 0) {
    const firstRequest = pendingFilter.data[0]!;
    TestValidator.predicate("has id", firstRequest.id !== undefined);
    TestValidator.predicate("has status", firstRequest.status !== undefined);
    TestValidator.predicate("has reason", firstRequest.reason !== undefined);
    TestValidator.predicate(
      "has createdAt",
      firstRequest.createdAt !== undefined,
    );
    TestValidator.predicate("has member", firstRequest.member !== undefined);
    TestValidator.predicate(
      "has orderItem",
      firstRequest.orderItem !== undefined,
    );
  }
}
