import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test the filtering capability where a super administrator searches snapshots by specific status transitions.
 * This validates the business logic for audit trail filtering used in dispute resolution.
 */
export async function test_api_admin_promotion_request_snapshot_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Testpassword123!",
    },
  });
  // 2. Authenticate as customer and create promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Testpassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I have extensive experience in e-commerce management and want to help moderate the platform.",
        },
      },
    );
  typia.assert(customerRequest);
  // 3. Authenticate as seller and create promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Testpassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "As a successful seller with high ratings, I want to contribute as a platform administrator.",
        },
      },
    );
  typia.assert(sellerRequest);
  // 4. Test snapshot filtering with various filter combinations
  // Test 4.1: Filter by new_status='approved' (finding approval transitions)
  const approvedFilterResult =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          new_status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedFilterResult);
  // Validate that all returned snapshots have newStatus matching the filter
  for (const snapshot of approvedFilterResult.data) {
    TestValidator.equals(
      "snapshot newStatus matches approved filter",
      snapshot.newStatus,
      "approved",
    );
  }
  // Test 4.2: Filter by previous_status='pending' and new_status='rejected' (finding rejection transitions)
  const rejectedFilterResult =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          previous_status: "pending",
          new_status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedFilterResult);
  // Validate that all returned snapshots match both filter criteria
  for (const snapshot of rejectedFilterResult.data) {
    TestValidator.equals(
      "snapshot previousStatus matches pending filter",
      snapshot.previousStatus,
      "pending",
    );
    TestValidator.equals(
      "snapshot newStatus matches rejected filter",
      snapshot.newStatus,
      "rejected",
    );
  }
  // Test 4.3: Filter with date range (created_at_from and created_at_to)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current is valid",
    () => dateRangeResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => dateRangeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    () => dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    () => dateRangeResult.pagination.pages >= 0,
  );
  // Validate date range filtering - all snapshots should be within the specified range
  for (const snapshot of dateRangeResult.data) {
    const snapshotDate = new Date(snapshot.createdAt).getTime();
    TestValidator.predicate(
      "snapshot createdAt is within date range",
      () =>
        snapshotDate >= oneDayAgo.getTime() &&
        snapshotDate <= oneDayLater.getTime(),
    );
  }
  // Test 4.4: Test pagination with filters
  const paginatedResult =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination with custom limit
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current matches request",
    paginatedResult.pagination.current,
    1,
  );
  // Test 4.5: Combined filters (status + date range + pagination)
  const combinedFilterResult =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          previous_status: "pending",
          new_status: "approved",
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Validate combined filter logic (AND behavior)
  for (const snapshot of combinedFilterResult.data) {
    TestValidator.equals(
      "combined filter - previousStatus is pending",
      snapshot.previousStatus,
      "pending",
    );
    TestValidator.equals(
      "combined filter - newStatus is approved",
      snapshot.newStatus,
      "approved",
    );
    const snapshotDate = new Date(snapshot.createdAt).getTime();
    TestValidator.predicate(
      "combined filter - snapshot within date range",
      () =>
        snapshotDate >= oneDayAgo.getTime() &&
        snapshotDate <= oneDayLater.getTime(),
    );
  }
  // 5. Validate empty result handling with non-matching filters
  const emptyResult =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          previous_status: "approved",
          new_status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
}
