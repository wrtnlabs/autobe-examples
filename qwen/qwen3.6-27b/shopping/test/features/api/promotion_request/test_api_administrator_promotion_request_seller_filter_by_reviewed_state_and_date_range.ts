import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_administrator_promotion_request_seller_filter_by_reviewed_state_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 1.1. Baseline - retrieve all promotion requests without filters
  const allBody = {
    limit: 10,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const allResult =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: allBody },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "baseline current page",
    allResult.pagination.current,
    1,
  );
  TestValidator.equals("baseline limit", allResult.pagination.limit, 10);
  TestValidator.predicate(
    "baseline has non-negative records",
    () => allResult.pagination.records >= 0,
  );
  TestValidator.predicate("baseline pages is zero when no records", () =>
    allResult.pagination.records === 0
      ? allResult.pagination.pages === 0
      : allResult.pagination.pages > 0,
  );
  // 2. Filter reviewed=false - only unreviewed/pending requests
  const unreviewedBody = {
    reviewed: false,
    limit: 20,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const unreviewedResult =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: unreviewedBody },
    );
  typia.assert(unreviewedResult);
  TestValidator.equals(
    "unreviewed current page",
    unreviewedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "unreviewed limit",
    unreviewedResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "unreviewed records count correct",
    () => unreviewedResult.pagination.records === unreviewedResult.data.length,
  );
  // Verify all unreviewed items have reviewed_at as null or undefined
  await ArrayUtil.asyncForEach(unreviewedResult.data, async (item) => {
    const safeItem = typia.assert(item);
    TestValidator.predicate(
      "unreviewed item has null reviewed_at",
      () => safeItem.reviewed_at === null || safeItem.reviewed_at === undefined,
    );
    TestValidator.equals(
      "unreviewed item status is pending",
      safeItem.status,
      "pending",
    );
  });
  // 3. Filter reviewed=true - only reviewed/approved/rejected requests
  const reviewedBody = {
    reviewed: true,
    limit: 20,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const reviewedResult =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: reviewedBody },
    );
  typia.assert(reviewedResult);
  TestValidator.equals(
    "reviewed current page",
    reviewedResult.pagination.current,
    1,
  );
  TestValidator.equals("reviewed limit", reviewedResult.pagination.limit, 20);
  TestValidator.predicate(
    "reviewed records count correct",
    () => reviewedResult.pagination.records === reviewedResult.data.length,
  );
  // Verify all reviewed items have non-null reviewed_at
  await ArrayUtil.asyncForEach(reviewedResult.data, async (item) => {
    const safeItem = typia.assert(item);
    TestValidator.predicate(
      "reviewed item has non-null reviewed_at",
      () => safeItem.reviewed_at !== null && safeItem.reviewed_at !== undefined,
    );
    TestValidator.predicate(
      "reviewed item status is not pending",
      () => safeItem.status === "approved" || safeItem.status === "rejected",
    );
  });
  // 4. Filter by reviewed_at_from and reviewed_at_to date range
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const reviewedDateRangeBody = {
    reviewed: true,
    reviewed_at_from: monthAgo.toISOString(),
    reviewed_at_to: now.toISOString(),
    limit: 15,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const reviewedDateResult =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: reviewedDateRangeBody },
    );
  typia.assert(reviewedDateResult);
  TestValidator.equals(
    "reviewed date range current page",
    reviewedDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "reviewed date range limit",
    reviewedDateResult.pagination.limit,
    15,
  );
  TestValidator.predicate(
    "reviewed date range records non-negative",
    () => reviewedDateResult.pagination.records >= 0,
  );
  // 5. Filter by reviewed_by_admin_id
  const randomAdminId = typia.random<string & tags.Format<"uuid">>();
  const byReviewerBody = {
    reviewed: true,
    reviewed_by_admin_id: randomAdminId,
    limit: 5,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const byReviewerResult =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: byReviewerBody },
    );
  typia.assert(byReviewerResult);
  TestValidator.equals(
    "by reviewer current page",
    byReviewerResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "by reviewer limit",
    byReviewerResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "by reviewer records non-negative",
    () => byReviewerResult.pagination.records >= 0,
  );
  // Verify reviewedByAdmin relation exists when filtered by reviewed_by_admin_id
  await ArrayUtil.asyncForEach(byReviewerResult.data, async (item) => {
    const safeItem = typia.assert(item);
    if (
      safeItem.reviewedByAdmin !== null &&
      safeItem.reviewedByAdmin !== undefined
    ) {
      const admin = typia.assert(safeItem.reviewedByAdmin);
      TestValidator.equals(
        "reviewedByAdmin id matches filter",
        admin.id,
        randomAdminId,
      );
      TestValidator.predicate(
        "reviewedByAdmin has is_super",
        typeof admin.is_super === "boolean",
      );
      TestValidator.predicate(
        "reviewedByAdmin has is_banned",
        typeof admin.is_banned === "boolean",
      );
      TestValidator.predicate(
        "reviewedByAdmin has created_at",
        admin.created_at !== undefined,
      );
      TestValidator.predicate(
        "reviewedByAdmin has updated_at",
        admin.updated_at !== undefined,
      );
    }
  });
  // 6. Filter by created_at_from and created_at_to submission date range
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const creationDateRangeBody = {
    created_at_from: threeMonthsAgo.toISOString(),
    created_at_to: now.toISOString(),
    limit: 10,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const creationDateResult =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: creationDateRangeBody },
    );
  typia.assert(creationDateResult);
  TestValidator.equals(
    "creation date range current page",
    creationDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "creation date range limit",
    creationDateResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "creation date range records non-negative",
    () => creationDateResult.pagination.records >= 0,
  );
  // 7. Combined filter - reviewed + actor_type + date ranges + reviewer
  const combinedBody = {
    reviewed: true,
    actor_type: "seller" as const,
    reviewed_at_from: monthAgo.toISOString(),
    reviewed_at_to: now.toISOString(),
    reviewed_by_admin_id: randomAdminId,
    limit: 10,
    page: 1,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const combinedResult =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: combinedBody },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined current page",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals("combined limit", combinedResult.pagination.limit, 10);
  TestValidator.predicate(
    "combined records non-negative",
    () => combinedResult.pagination.records >= 0,
  );
  // Verify combined filter results: all must be seller type and reviewed
  await ArrayUtil.asyncForEach(combinedResult.data, async (item) => {
    const safeItem = typia.assert(item);
    TestValidator.equals(
      "combined item actor_type is seller",
      safeItem.actor_type,
      "seller",
    );
    TestValidator.predicate(
      "combined item has reviewed_at",
      () => safeItem.reviewed_at !== null && safeItem.reviewed_at !== undefined,
    );
    if (
      safeItem.reviewedByAdmin !== null &&
      safeItem.reviewedByAdmin !== undefined
    ) {
      const admin = typia.assert(safeItem.reviewedByAdmin);
      TestValidator.equals(
        "combined item reviewedByAdmin matches filter",
        admin.id,
        randomAdminId,
      );
    }
  });
  // 8. Pagination navigation - verify page 2 metadata when filtering
  const filteredPage2Body = {
    reviewed: false,
    limit: 5,
    page: 2,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const filteredPage2Result =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: filteredPage2Body },
    );
  typia.assert(filteredPage2Result);
  TestValidator.equals(
    "page 2 navigation current page",
    filteredPage2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 navigation limit",
    filteredPage2Result.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 2 data length within limit",
    () =>
      filteredPage2Result.data.length <= filteredPage2Result.pagination.limit,
  );
}
