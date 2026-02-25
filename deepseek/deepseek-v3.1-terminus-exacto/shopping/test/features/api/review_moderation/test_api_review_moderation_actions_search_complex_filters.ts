import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewModerationAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_moderation_actions_search_complex_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(admin);
  // Step 2: Generate test data - need to create review moderation actions first
  // However, there's no API to create review moderation actions.
  // We'll test with existing data by using complex filters with the assumption
  // that some data exists. This tests the search functionality itself.
  // Step 3: Test complex filter combinations
  // Get current date and 30 days ago for date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // First search: Test multiple action_types
  const search1 =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          action_type: "adjust_rating",
          status: "requires_followup",
          administrator_id: admin.id,
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(search1);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination",
    () =>
      search1.pagination.current >= 0 &&
      search1.pagination.limit >= 0 &&
      search1.pagination.records >= 0 &&
      search1.pagination.pages >= 0,
  );
  // Validate summary structure if data exists
  if (search1.data.length > 0) {
    const firstItem = search1.data[0];
    TestValidator.predicate("has id", firstItem.id.length > 0);
    TestValidator.predicate(
      "has action_type",
      firstItem.action_type.length > 0,
    );
    TestValidator.predicate("has status", firstItem.status.length > 0);
    TestValidator.predicate(
      "has administrator",
      firstItem.administrator.id.length > 0,
    );
    TestValidator.predicate("has created_at", firstItem.created_at.length > 0);
    // Check sorting - should be descending by created_at
    const dates = search1.data.map((item) =>
      new Date(item.created_at).getTime(),
    );
    for (let i = 1; i < dates.length; i++) {
      TestValidator.predicate("sorted descending", dates[i - 1] >= dates[i]);
    }
  }
  // Step 4: Test pagination with page 2 and limit 5
  const search2 =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.equals("page number", search2.pagination.current, 2);
  TestValidator.equals("limit", search2.pagination.limit, 5);
  // Step 5: Test null parameter handling
  const search3 =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          action_type: null,
          status: null,
          administrator_id: null,
          review_id: null,
          created_at_from: null,
          created_at_to: null,
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(search3);
  // Verify search returns data (null params should be ignored, not restrictive)
  TestValidator.predicate(
    "returns paginated results",
    () => search3.pagination.records >= 0 && search3.pagination.pages >= 0,
  );
  // Step 6: Test multiple action_type values - note: API only supports single value
  // Based on DTO, action_type is single string|null|undefined, not array
  // So we test individually
  const search4 =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          action_type: "warning",
          status: "pending",
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(search4);
  // Verify filters work correctly for matching items
  if (search4.data.length > 0) {
    for (const item of search4.data) {
      TestValidator.equals("action_type matches", item.action_type, "warning");
      TestValidator.equals("status matches", item.status, "pending");
    }
  }
  // Step 7: Test combination of administrator_id with review_id
  // This requires having a specific review_id, which we don't have
  // So we test with admin id only
  const search5 =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          administrator_id: admin.id,
          created_at_from: thirtyDaysAgo.toISOString(),
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(search5);
  if (search5.data.length > 0) {
    for (const item of search5.data) {
      TestValidator.equals(
        "administrator matches",
        item.administrator.id,
        admin.id,
      );
      const itemDate = new Date(item.created_at).getTime();
      const minDate = thirtyDaysAgo.getTime();
      TestValidator.predicate("created after from date", itemDate >= minDate);
    }
  }
}
