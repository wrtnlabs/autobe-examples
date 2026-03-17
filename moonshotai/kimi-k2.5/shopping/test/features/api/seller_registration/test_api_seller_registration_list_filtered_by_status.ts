import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connections for different sellers
  const sellerConnection1: api.IConnection = { host: connection.host };
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerConnection3: api.IConnection = { host: connection.host };
  // Authenticate sellers and capture their IDs
  const seller1 = await authorize_seller_join(sellerConnection1, {});
  const seller2 = await authorize_seller_join(sellerConnection2, {});
  const seller3 = await authorize_seller_join(sellerConnection3, {});
  // Create multiple seller registrations (all initially have 'pending' status)
  const registration1 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection1,
      {},
    );
  typia.assert(registration1);
  const registration2 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection2,
      {},
    );
  typia.assert(registration2);
  const registration3 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection3,
      {},
    );
  typia.assert(registration3);
  // Base request with required fields
  const baseRequest = {
    limit: 10,
    cursor: null,
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: null,
    sortOrder: null,
    page: 1,
    status: null,
  } satisfies IEcommerceMallSellerRegistration.IRequest;
  // Test 1: Filter by pending status
  const pendingRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: "pending",
  };
  const pendingResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: pendingRequest },
    );
  typia.assert(pendingResult);
  // Validate all returned registrations have 'pending' status
  TestValidator.predicate(
    "pending filter returns only pending status registrations",
    pendingResult.data.every((reg) => reg.status === "pending"),
  );
  // Validate pending registrations have null reviewer
  TestValidator.predicate(
    "pending registrations have null reviewer",
    pendingResult.data.every((reg) => reg.reviewer === null),
  );
  // Validate pending registrations have null reviewedAt
  TestValidator.predicate(
    "pending registrations have null reviewedAt",
    pendingResult.data.every((reg) => reg.reviewedAt === null),
  );
  // Test 2: Date range filtering (createdAtFrom and createdAtTo)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: "pending",
    createdAtFrom: oneDayAgo.toISOString(),
    createdAtTo: oneDayLater.toISOString(),
  };
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResult);
  // Validate results are within date range
  TestValidator.predicate(
    "date range filter returns registrations within range",
    dateRangeResult.data.every((reg) => {
      const createdAt = new Date(reg.createdAt).getTime();
      return (
        createdAt >= oneDayAgo.getTime() && createdAt <= oneDayLater.getTime()
      );
    }),
  );
  // Test 3: Combined filters (status + date range)
  const combinedRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: "pending",
    createdAtFrom: oneDayAgo.toISOString(),
    createdAtTo: oneDayLater.toISOString(),
  };
  const combinedResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: combinedRequest },
    );
  typia.assert(combinedResult);
  // Validate combined filters work correctly
  TestValidator.predicate(
    "combined filters return only pending registrations within date range",
    combinedResult.data.every((reg) => {
      const createdAt = new Date(reg.createdAt).getTime();
      return (
        reg.status === "pending" &&
        createdAt >= oneDayAgo.getTime() &&
        createdAt <= oneDayLater.getTime()
      );
    }),
  );
  // Test 4: Pagination with filtered results
  const paginationRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: null,
    limit: 2,
    page: 1,
  };
  const page1Result =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: paginationRequest },
    );
  typia.assert(page1Result);
  TestValidator.predicate(
    "pagination respects limit",
    page1Result.data.length <= paginationRequest.limit,
  );
  TestValidator.predicate(
    "pagination metadata exists with current page",
    typeof page1Result.pagination.current === "number" &&
      page1Result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    typeof page1Result.pagination.records === "number" &&
      page1Result.pagination.records >= 0,
  );
  // Test 5: Different status filters (approved/rejected - should return empty for new setup)
  const approvedRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: "approved",
  };
  const approvedResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: approvedRequest },
    );
  typia.assert(approvedResult);
  // Approved filter should return only approved (empty array because we only created pending)
  TestValidator.predicate(
    "approved filter returns empty when no approved registrations exist",
    approvedResult.data.every((reg) => reg.status === "approved"),
  );
  const rejectedRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: "rejected",
  };
  const rejectedResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: rejectedRequest },
    );
  typia.assert(rejectedResult);
  // Rejected filter should return only rejected with rejectionReason
  TestValidator.predicate(
    "rejected filter returns only rejected statuses",
    rejectedResult.data.every((reg) => reg.status === "rejected"),
  );
  TestValidator.predicate(
    "rejected registrations include rejection reason",
    rejectedResult.data.every(
      (reg) => reg.status !== "rejected" || reg.rejectionReason !== null,
    ),
  );
  // Test 6: reviewedAt date filters with null values (for pending, these should be ignored or return all)
  const reviewedAtRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: "pending",
    reviewedAtFrom: oneDayAgo.toISOString(),
    reviewedAtTo: oneDayLater.toISOString(),
  };
  const reviewedAtResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: reviewedAtRequest },
    );
  typia.assert(reviewedAtResult);
  // Pending registrations have null reviewedAt, so they shouldn't match reviewed date filters
  // This tests that the filter properly handles null values
  TestValidator.predicate(
    "pending registrations with null reviewedAt excluded when reviewedAt filters applied",
    reviewedAtResult.data.length === 0,
  );
  // Test 7: Sorting by createdAt (default behavior check)
  const sortedRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    status: "pending",
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  const sortedResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: sortedRequest },
    );
  typia.assert(sortedResult);
  // Verify sorting is applied (newest first)
  if (sortedResult.data.length > 1) {
    const firstDate = new Date(sortedResult.data[0].createdAt).getTime();
    const secondDate = new Date(sortedResult.data[1].createdAt).getTime();
    TestValidator.predicate(
      "descending sort by createdAt returns newest first",
      firstDate >= secondDate,
    );
  }
  // Test 8: Verify rejectionReason is null for pending/approved, available only for rejected
  // Use seller.id from the authorized seller object since ISummary has seller.id
  const pendingReg = pendingResult.data.find(
    (reg) => reg.seller.id === seller1.id,
  );
  if (pendingReg) {
    TestValidator.equals(
      "pending registration has null rejectionReason",
      pendingReg.rejectionReason,
      null,
    );
  }
  // Test 9: Empty result handling (future date range)
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyRequest: IEcommerceMallSellerRegistration.IRequest = {
    ...baseRequest,
    createdAtFrom: futureDate.toISOString(),
    createdAtTo: new Date(futureDate.getTime() + 86400000).toISOString(),
  };
  const emptyResult =
    await api.functional.ecommerceMall.seller.seller_registrations.index(
      sellerConnection1,
      { body: emptyRequest },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "future date range returns empty data array",
    emptyResult.data.length === 0,
  );
}
