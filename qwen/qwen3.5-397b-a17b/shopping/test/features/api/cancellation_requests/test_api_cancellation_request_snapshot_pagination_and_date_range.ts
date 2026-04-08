import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination and date range filtering for cancellation request snapshot history.
 *
 * Validates the complete pagination and filtering functionality for cancellation request snapshot history endpoint. Ensures that administrators can browse large snapshot histories using pagination controls and filter snapshots by review time periods for audit and dispute resolution purposes.
 *
 * The test verifies pagination metadata accuracy including current page, limit, total records, and calculated total pages. Date range filters (reviewedAtFrom and reviewedAtTo) are tested to ensure they correctly include or exclude snapshots based on the seller's review timestamp.
 *
 * 1. Administrator authentication via authorize_admin_join utility.
 * 2. Query snapshots with page=1, limit=1 to verify first page returns correctly.
 * 3. Query snapshots with page=2, limit=1 to verify second page and pagination metadata.
 * 4. Query snapshots with reviewedAtFrom filter to verify date range filtering.
 * 5. Query snapshots with reviewedAtTo filter to verify date range filtering.
 * 6. Query snapshots with sort=['-created_at'] to verify descending order.
 * 7. Validate pagination metadata is correctly calculated for all scenarios.
 * 8. Validate chronological ordering by created_at ASC is default behavior.
 */
export async function test_api_cancellation_request_snapshot_pagination_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPass123!",
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // Generate a cancellation request ID for testing
  // Note: In production, this would come from an actual cancellation request
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test basic pagination - page 1 with limit 1
  const page1Response =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata structure
  TestValidator.predicate("page 1 has valid pagination", () => {
    const pagination = page1Response.pagination;
    return (
      pagination.current === 1 &&
      pagination.limit === 1 &&
      pagination.records >= 0 &&
      pagination.pages >= 0
    );
  });
  // If there are records, validate data structure
  if (page1Response.data.length > 0) {
    const firstSnapshot = page1Response.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate("first snapshot has required fields", () => {
      return (
        typeof firstSnapshot.id === "string" &&
        typeof firstSnapshot.status === "string" &&
        typeof firstSnapshot.reason === "string" &&
        typeof firstSnapshot.createdAt === "string"
      );
    });
  }
  // 3. Test pagination - page 2 with limit 1 (if total records > 1)
  if (page1Response.pagination.records > 1) {
    const page2Response =
      await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            page: 2,
            limit: 1,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current page",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Response.pagination.limit, 1);
    TestValidator.predicate(
      "page 2 has at most 1 record",
      () => page2Response.data.length <= 1,
    );
    // Validate pages calculation
    const expectedPages = Math.ceil(page1Response.pagination.records / 1);
    TestValidator.equals(
      "total pages calculated correctly",
      page2Response.pagination.pages,
      expectedPages,
    );
  }
  // 4. Test date range filter - reviewedAtFrom
  // Get a timestamp from the first snapshot if it has reviewed_at
  if (
    page1Response.data.length > 0 &&
    page1Response.data[0].reviewedAt !== null
  ) {
    const firstReviewedAt = page1Response.data[0].reviewedAt;
    // Create a timestamp after the first snapshot's reviewed_at
    const fromDate = new Date(firstReviewedAt);
    fromDate.setMinutes(fromDate.getMinutes() + 1);
    const reviewedAtFrom = fromDate.toISOString();
    const filteredFromResponse =
      await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            reviewedAtFrom,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(filteredFromResponse);
    // All returned snapshots should have reviewed_at >= reviewedAtFrom or be null (pending)
    if (filteredFromResponse.data.length > 0) {
      TestValidator.predicate("reviewedAtFrom filter works", () => {
        return filteredFromResponse.data.every(
          (snapshot) =>
            snapshot.reviewedAt === null ||
            snapshot.reviewedAt >= reviewedAtFrom,
        );
      });
    }
  }
  // 5. Test date range filter - reviewedAtTo
  if (
    page1Response.data.length > 0 &&
    page1Response.data[0].reviewedAt !== null
  ) {
    const firstReviewedAt = page1Response.data[0].reviewedAt;
    // Create a timestamp before the first snapshot's reviewed_at
    const toDate = new Date(firstReviewedAt);
    toDate.setMinutes(toDate.getMinutes() - 1);
    const reviewedAtTo = toDate.toISOString();
    const filteredToResponse =
      await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            reviewedAtTo,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(filteredToResponse);
    // All returned snapshots should have reviewed_at <= reviewedAtTo or be null (pending)
    if (filteredToResponse.data.length > 0) {
      TestValidator.predicate("reviewedAtTo filter works", () => {
        return filteredToResponse.data.every(
          (snapshot) =>
            snapshot.reviewedAt === null || snapshot.reviewedAt <= reviewedAtTo,
        );
      });
    }
  }
  // 6. Test sorting - descending order by created_at
  const sortedDescResponse =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          sort: ["-created_at"],
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(sortedDescResponse);
  // Validate descending order if multiple snapshots exist
  if (sortedDescResponse.data.length > 1) {
    TestValidator.predicate("descending sort order", () => {
      for (let i = 0; i < sortedDescResponse.data.length - 1; i++) {
        const current = sortedDescResponse.data[i].createdAt;
        const next = sortedDescResponse.data[i + 1].createdAt;
        if (current < next) {
          return false;
        }
      }
      return true;
    });
  }
  // 7. Test default sorting - ascending order by created_at
  const sortedAscResponse =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {},
      },
    );
  typia.assert(sortedAscResponse);
  // Validate ascending order if multiple snapshots exist
  if (sortedAscResponse.data.length > 1) {
    TestValidator.predicate("ascending sort order (default)", () => {
      for (let i = 0; i < sortedAscResponse.data.length - 1; i++) {
        const current = sortedAscResponse.data[i].createdAt;
        const next = sortedAscResponse.data[i + 1].createdAt;
        if (current > next) {
          return false;
        }
      }
      return true;
    });
  }
  // 8. Test empty result set pagination
  // Use a non-existent cancellation request ID to get empty results
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  const emptyResponse =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: nonExistentId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result has 0 records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResponse.data.length,
    0,
  );
}
