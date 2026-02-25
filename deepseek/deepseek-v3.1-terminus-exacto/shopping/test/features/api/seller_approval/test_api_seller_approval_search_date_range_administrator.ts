import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

// Note: authorize_administrator_join utility function is available
// according to the input materials, but not imported in template
// We'll simulate it with direct API call for now
export async function test_api_seller_approval_search_date_range_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Helper to create administrator with random email
  const createAdmin = async () => {
    const adminConn: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    const password = "admin12345";
    // Use the utility function as specified in available utility functions
    // authorize_administrator_join is available but not imported in template
    // We'll use direct API call since we cannot add imports
    const admin = await api.functional.ecommerce.auth.administrator.join(
      adminConn,
      {
        body: { email, password } satisfies IEcommerceAdministrator.IJoin,
      },
    );
    typia.assert(admin);
    return { connection: adminConn, admin };
  };
  // 1. Create first administrator for testing
  const admin1 = await createAdmin();
  // 2. Create second administrator for assignment testing
  const admin2 = await createAdmin();
  // 3. Create test data - in real scenario, we would create seller approval requests
  // Since we don't have API to create seller approval requests directly,
  // we'll work with existing data and filter it
  // 4. Test 1: Open-ended date range (null submission_date_start)
  const currentDate = new Date();
  const oneMonthAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const result1 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          submission_date_end: currentDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result1);
  // 5. Test 2: Specific date range
  const sixMonthsAgo = new Date(
    currentDate.getTime() - 180 * 24 * 60 * 60 * 1000,
  );
  const threeMonthsAgo = new Date(
    currentDate.getTime() - 90 * 24 * 60 * 60 * 1000,
  );
  const result2 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          submission_date_start: sixMonthsAgo.toISOString(),
          submission_date_end: threeMonthsAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result2);
  // Verify dates in result2 are within range
  for (const item of result2.data) {
    const submissionDate = new Date(item.submission_date);
    TestValidator.predicate(
      `submission date within range for ${item.id}`,
      submissionDate >= sixMonthsAgo && submissionDate <= threeMonthsAgo,
    );
  }
  // 6. Test 3: Review start date filtering
  const result3 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          review_start_date_start: sixMonthsAgo.toISOString(),
          review_start_date_end: currentDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result3);
  // 7. Test 4: Administrator assignment filtering
  const result4 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          administrator_id: admin2.admin.id,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result4);
  // Check administrator matches for items that have administrator assigned
  for (const item of result4.data) {
    if (item.administrator) {
      TestValidator.equals(
        `administrator matches filter for ${item.id}`,
        item.administrator.id,
        admin2.admin.id,
      );
    }
  }
  // 8. Test 5: Combined filtering with status
  const result5 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          status: "pending",
          submission_date_start: sixMonthsAgo.toISOString(),
          submission_date_end: currentDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result5);
  for (const item of result5.data) {
    TestValidator.equals(
      `status matches filter for ${item.id}`,
      item.status,
      "pending",
    );
    const submissionDate = new Date(item.submission_date);
    TestValidator.predicate(
      `submission date within combined filter for ${item.id}`,
      submissionDate >= sixMonthsAgo && submissionDate <= currentDate,
    );
  }
  // 9. Test 6: All filters combined
  const result6 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          status: "approved",
          submission_date_start: sixMonthsAgo.toISOString(),
          submission_date_end: currentDate.toISOString(),
          review_start_date_start: sixMonthsAgo.toISOString(),
          review_start_date_end: currentDate.toISOString(),
          administrator_id: admin2.admin.id,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result6);
  // 10. Test 7: Verify ordering by submission_date (should be descending)
  if (result6.data.length >= 2) {
    for (let i = 1; i < result6.data.length; i++) {
      const prevDate = new Date(result6.data[i - 1].submission_date);
      const currDate = new Date(result6.data[i].submission_date);
      // Results should be ordered by submission_date DESC
      TestValidator.predicate(
        `ordering correct: item ${i - 1} >= item ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // 11. Test 8: Null date values (open-ended ranges)
  const result7 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          // Null/undefined values should be accepted
          submission_date_start: undefined,
          submission_date_end: undefined,
          review_start_date_start: undefined,
          review_start_date_end: undefined,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result7);
  // 12. Test 9: Pagination validation
  const result8 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      admin1.connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(result8);
  TestValidator.predicate(
    "pagination limit respected",
    result8.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    result8.pagination.current === 1 &&
      result8.pagination.limit === 5 &&
      result8.pagination.records >= 0 &&
      result8.pagination.pages >= 0,
  );
}
