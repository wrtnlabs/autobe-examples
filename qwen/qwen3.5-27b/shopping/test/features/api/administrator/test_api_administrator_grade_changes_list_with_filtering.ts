import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can search and list administrator grade change audit records with various filters.
 *
 * Validates the complete administrator grade change audit listing functionality including filtering by change type, grade values, administrator IDs, performer IDs, and date ranges. Ensures pagination works correctly and sorting can be applied to results.
 *
 * Special attention is given to verifying that all filter combinations return the correct subset of records, pagination metadata is accurate, and related administrator summaries are properly included in each grade change record.
 *
 * 1. Register and authenticate as an administrator
 * 2. Call the grade changes endpoint without filters and verify pagination metadata
 * 3. Test filtering by changeType='promotion' and verify only promotions returned
 * 4. Test filtering by changeType='demotion' and verify only demotions returned
 * 5. Test filtering by previousGrade and newGrade combinations
 * 6. Test filtering by administratorId and performedById
 * 7. Test filtering by dateRange
 * 8. Test pagination with page 2 and limit 10
 * 9. Test sorting by change_type:asc
 */
export async function test_api_administrator_grade_changes_list_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Call without filters - verify pagination metadata
  const allChanges =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(allChanges);
  TestValidator.predicate(
    "pagination has current page",
    allChanges.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allChanges.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    allChanges.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allChanges.pagination.pages >= 0,
  );
  // Verify each record structure
  if (allChanges.data.length > 0) {
    const firstChange = allChanges.data[0];
    TestValidator.predicate("record has id", firstChange.id !== undefined);
    TestValidator.predicate(
      "record has previous_grade",
      firstChange.previous_grade === "regular" ||
        firstChange.previous_grade === "super",
    );
    TestValidator.predicate(
      "record has new_grade",
      firstChange.new_grade === "regular" || firstChange.new_grade === "super",
    );
    TestValidator.predicate(
      "record has change_type",
      firstChange.change_type === "promotion" ||
        firstChange.change_type === "demotion",
    );
    TestValidator.predicate(
      "record has created_at",
      firstChange.created_at !== undefined,
    );
    TestValidator.predicate(
      "record has administrator summary",
      firstChange.administrator.id !== undefined,
    );
    TestValidator.predicate(
      "record has performedBy summary",
      firstChange.performedBy.id !== undefined,
    );
  }
  // 3. Filter by changeType='promotion'
  const promotions =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      adminConnection,
      {
        body: {
          changeType: "promotion",
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(promotions);
  if (promotions.data.length > 0) {
    for (const change of promotions.data) {
      TestValidator.equals(
        "all records are promotions",
        change.change_type,
        "promotion",
      );
    }
  }
  // 4. Filter by changeType='demotion'
  const demotions =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      adminConnection,
      {
        body: {
          changeType: "demotion",
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(demotions);
  if (demotions.data.length > 0) {
    for (const change of demotions.data) {
      TestValidator.equals(
        "all records are demotions",
        change.change_type,
        "demotion",
      );
    }
  }
  // 5. Filter by previousGrade='regular' and newGrade='super'
  const regularToSuper =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      adminConnection,
      {
        body: {
          previousGrade: "regular",
          newGrade: "super",
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(regularToSuper);
  if (regularToSuper.data.length > 0) {
    for (const change of regularToSuper.data) {
      TestValidator.equals(
        "previous grade is regular",
        change.previous_grade,
        "regular",
      );
      TestValidator.equals("new grade is super", change.new_grade, "super");
    }
  }
  // 6. Filter by administratorId (use first change's administrator if available)
  if (allChanges.data.length > 0) {
    const targetAdminId = allChanges.data[0].administrator.id;
    const adminFiltered =
      await api.functional.shoppingMall.administrator.grade_changes.index(
        adminConnection,
        {
          body: {
            administratorId: targetAdminId,
          } satisfies IShoppingMallAdministratorGradeChange.IRequest,
        },
      );
    typia.assert(adminFiltered);
    if (adminFiltered.data.length > 0) {
      for (const change of adminFiltered.data) {
        TestValidator.equals(
          "all records are for target administrator",
          change.administrator.id,
          targetAdminId,
        );
      }
    }
    // 7. Filter by performedById
    const performerId = allChanges.data[0].performedBy.id;
    const performerFiltered =
      await api.functional.shoppingMall.administrator.grade_changes.index(
        adminConnection,
        {
          body: {
            performedById: performerId,
          } satisfies IShoppingMallAdministratorGradeChange.IRequest,
        },
      );
    typia.assert(performerFiltered);
    if (performerFiltered.data.length > 0) {
      for (const change of performerFiltered.data) {
        TestValidator.equals(
          "all records performed by target performer",
          change.performedBy.id,
          performerId,
        );
      }
    }
  }
  // 8. Filter by dateRange
  const now = new Date();
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
  );
  const dateRangeFiltered =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      adminConnection,
      {
        body: {
          dateRange: {
            from: oneYearAgo.toISOString(),
            to: now.toISOString(),
          },
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  if (dateRangeFiltered.data.length > 0) {
    for (const change of dateRangeFiltered.data) {
      const changeDate = new Date(change.created_at);
      TestValidator.predicate(
        "record is within date range",
        changeDate >= oneYearAgo && changeDate <= now,
      );
    }
  }
  // 9. Test pagination with page 2 and limit 10
  const paginated =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("current page is 2", paginated.pagination.current, 2);
  TestValidator.equals("limit is 10", paginated.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 data length does not exceed limit",
    paginated.data.length <= 10,
  );
  // 10. Test sorting by change_type:asc
  const sorted =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      adminConnection,
      {
        body: {
          sort: "change_type:asc",
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(sorted);
  if (sorted.data.length > 1) {
    for (let i = 1; i < sorted.data.length; i++) {
      TestValidator.predicate(
        `records are sorted by change_type ascending at index ${i}`,
        sorted.data[i - 1].change_type <= sorted.data[i].change_type,
      );
    }
  }
}
